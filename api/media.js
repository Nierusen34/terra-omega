import { applyCors } from "./_lib/cors.js";
import { requireEditor } from "./_lib/auth.js";
import { getHead, readTextFile, readBinaryFile, commitFiles } from "./_lib/github.js";
import { parseDataAssignment, renderCharacterMedia, renderMediaLibrary } from "./_lib/data-files.js";
import {
  PRIVATE_CHARACTER_DATA_PATH,
  readPrivateCharacterData,
  renderPrivateCharacterData
} from "./_lib/private-character-data.js";

const MAX_BYTES = 2 * 1024 * 1024;
const EXTENSIONS = {
  "image/png":"png",
  "image/jpeg":"jpg",
  "image/webp":"webp"
};

const MIME_BY_EXT = {
  png:"image/png",
  jpg:"image/jpeg",
  jpeg:"image/jpeg",
  webp:"image/webp"
};

const FANDOM_API = "https://dc.fandom.com/api.php";
const MAX_DC_TITLE_LENGTH = 180;

function safeDcText(value,max=MAX_DC_TITLE_LENGTH){
  return String(value || "").trim().slice(0,max);
}

function cleanDcTitle(value){
  return safeDcText(value).replace(/[\u0000-\u001f\u007f]/g,"");
}

function safeHttpsUrl(value,max=1200){
  const raw=String(value || "").trim().slice(0,max);
  if(!raw) return "";
  try{
    const url=new URL(raw);
    if(url.protocol !== "https:") return "";
    return url.toString();
  }catch(error){
    return "";
  }
}

function clamp(value,min,max,fallback){
  const number=Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.min(max,Math.max(min,number));
}

function normalizeFramingPreset(value){
  const source=value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const fit=source.fit === "contain" ? "contain" : "cover";
  return {
    fit,
    x:clamp(source.x,0,100,50),
    y:clamp(source.y,0,100,50),
    zoom:clamp(source.zoom,0.5,2.5,1)
  };
}

function normalizePortraitFraming(value){
  const input=value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    card:normalizeFramingPreset(input.card),
    sheet:normalizeFramingPreset(input.sheet),
    graph:normalizeFramingPreset(input.graph)
  };
}

function normalizeAutoSource(body){
  const provider=String(body.provider || "none").trim();

  if(provider === "none") return null;

  if(provider === "dc-fandom"){
    const wikiTitle=cleanDcTitle(body.wikiTitle);
    if(!wikiTitle){
      const error=new Error("Informe o título da página/versão na DC Database.");
      error.status=400;
      error.code="missing_wiki_title";
      throw error;
    }
    return {provider:"dc-fandom",wikiTitle};
  }

  if(provider === "external-url"){
    const imageUrl=safeHttpsUrl(body.imageUrl);
    if(!imageUrl){
      const error=new Error("Informe uma URL HTTPS válida para a imagem externa.");
      error.status=400;
      error.code="invalid_external_image_url";
      throw error;
    }

    const pageUrl=safeHttpsUrl(body.pageUrl);
    const sourceLabel=safeDcText(body.sourceLabel,160) || "Fonte externa";
    const fallbackWikiTitle=cleanDcTitle(body.fallbackWikiTitle);

    return {
      provider:"external-url",
      imageUrl,
      ...(pageUrl ? {pageUrl} : {}),
      ...(fallbackWikiTitle ? {fallbackWikiTitle} : {}),
      sourceLabel
    };
  }

  const error=new Error("Fonte automática de retrato desconhecida.");
  error.status=400;
  error.code="invalid_auto_provider";
  throw error;
}

function dcPageImage(page){
  if(!page || page.missing) return "";
  return (
    (page.thumbnail && page.thumbnail.source) ||
    (page.original && page.original.source) ||
    ""
  );
}

function dcPageOriginal(page){
  if(!page || page.missing) return "";
  return (
    (page.original && page.original.source) ||
    (page.thumbnail && page.thumbnail.source) ||
    ""
  );
}

function dcPageUrl(page){
  if(page && page.fullurl) return page.fullurl;
  if(page && page.title){
    return "https://dc.fandom.com/wiki/" + encodeURIComponent(page.title.replace(/ /g,"_"));
  }
  return "";
}

async function fandomQuery(params){
  const url = new URL(FANDOM_API);
  Object.entries(params).forEach(([key,value])=>{
    if(value !== undefined && value !== null && value !== "") url.searchParams.set(key,String(value));
  });

  const response = await fetch(url,{
    headers:{
      "Accept":"application/json",
      "User-Agent":"Terra-Omega/1.0 (character portrait resolver)"
    },
    signal:AbortSignal.timeout(9000)
  });

  if(!response.ok){
    const error = new Error("DC Database respondeu HTTP " + response.status);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function exactDcPage(title){
  const data = await fandomQuery({
    action:"query",
    format:"json",
    formatversion:"2",
    redirects:"1",
    prop:"pageimages|info",
    inprop:"url",
    piprop:"thumbnail|original|name",
    pithumbsize:"900",
    pilicense:"any",
    titles:title
  });

  return data && data.query && Array.isArray(data.query.pages)
    ? data.query.pages[0]
    : null;
}

function scoreDcCandidate(page,name,preferredTitle){
  const title=String((page && page.title) || "").toLowerCase();
  const n=String(name || "").toLowerCase();
  const preferred=String(preferredTitle || "").toLowerCase();
  let score=0;
  if(title === preferred) score += 100;
  if(title.includes("(prime earth)")) score += 50;
  if(n && title.startsWith(n)) score += 30;
  if(dcPageImage(page)) score += 20;
  return score;
}

async function searchDcPage(name,preferredTitle){
  const query = [name,"Prime Earth"].filter(Boolean).join(" ");
  const data = await fandomQuery({
    action:"query",
    format:"json",
    formatversion:"2",
    generator:"search",
    gsrsearch:query,
    gsrnamespace:"0",
    gsrlimit:"8",
    prop:"pageimages|info",
    inprop:"url",
    piprop:"thumbnail|original|name",
    pithumbsize:"900",
    pilicense:"any"
  });

  const pages = data && data.query && Array.isArray(data.query.pages)
    ? data.query.pages.filter(page=>page && !page.missing)
    : [];

  pages.sort((a,b)=>scoreDcCandidate(b,name,preferredTitle)-scoreDcCandidate(a,name,preferredTitle));
  return pages.find(page=>dcPageImage(page)) || pages[0] || null;
}

async function handleDcPortrait(req,res){
  const title=cleanDcTitle((req.query || {}).title);
  const name=cleanDcTitle((req.query || {}).name || title.replace(/\s*\([^)]*\)\s*$/,""));

  if(!title || title.length > MAX_DC_TITLE_LENGTH){
    return res.status(400).json({
      error:"invalid_title",
      message:"Título da página da DC Database inválido."
    });
  }

  try{
    let page=await exactDcPage(title);

    if(!page || page.missing || !dcPageImage(page)){
      page=await searchDcPage(name,title);
    }

    const imageUrl=dcPageImage(page);

    if(!page || !imageUrl){
      res.setHeader("Cache-Control","public, max-age=300, s-maxage=21600, stale-while-revalidate=86400");
      return res.status(200).json({
        ok:true,
        found:false,
        name,
        requestedTitle:title,
        provider:"dc-fandom"
      });
    }

    res.setHeader("Cache-Control","public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");

    return res.status(200).json({
      ok:true,
      found:true,
      name,
      requestedTitle:title,
      title:page.title || title,
      imageUrl,
      fullImageUrl:dcPageOriginal(page),
      pageUrl:dcPageUrl(page),
      provider:"dc-fandom",
      source:"DC Database · Fandom"
    });
  }catch(error){
    console.error("Terra Omega DC portrait resolver:",error);
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({
      error:"dc_source_unavailable",
      message:"A fonte automática de retratos da DC está temporariamente indisponível."
    });
  }
}

async function handleExternalPortrait(req,res){
  const name=cleanDcTitle((req.query || {}).name);

  if(!name){
    return res.status(400).json({error:"missing_character",message:"Personagem não informado."});
  }

  try{
    const mediaFile=await readTextFile("data/character-media.js");
    const mediaData=parseDataAssignment(mediaFile.content,"characterMedia");
    const item=mediaData[name] && typeof mediaData[name] === "object" ? mediaData[name] : {};
    const auto=item.auto && typeof item.auto === "object" ? item.auto : {};
    const imageUrl=auto.provider === "external-url" ? safeHttpsUrl(auto.imageUrl,1600) : "";

    if(!imageUrl){
      return res.status(404).json({
        error:"external_portrait_not_found",
        message:"Este personagem não possui retrato externo configurado."
      });
    }

    const response=await fetch(imageUrl,{
      redirect:"follow",
      headers:{
        "Accept":"image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",
        "User-Agent":"Mozilla/5.0 (compatible; Terra-Omega/1.0; +https://terra-omega-rpg.vercel.app)"
      },
      signal:AbortSignal.timeout(12000)
    });

    if(!response.ok) throw new Error("Fonte externa respondeu HTTP " + response.status);

    const contentType=String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if(!contentType.startsWith("image/")) throw new Error("A fonte externa não retornou uma imagem.");

    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length || buffer.length > 8 * 1024 * 1024) throw new Error("Imagem externa inválida ou grande demais.");

    res.setHeader("Content-Type",contentType);
    res.setHeader("Cache-Control","public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.status(200).send(buffer);
  }catch(error){
    console.error("Terra Omega external portrait proxy:",name,error);
    res.setHeader("Cache-Control","no-store");
    return res.status(502).json({
      error:"external_source_unavailable",
      message:"A fonte externa do retrato está temporariamente indisponível."
    });
  }
}

function slugify(value){
  return String(value)
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/['’]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,80);
}

function validMagic(buffer,mime){
  if(mime === "image/png") return buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if(mime === "image/webp") return buffer.length >= 12 && buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP";
  return false;
}

function statusUrl(req,sha){
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return proto + "://" + req.headers.host + "/api/status?sha=" + encodeURIComponent(sha);
}

function privateProfile(entry){
  return entry && entry.profile && typeof entry.profile === "object" && !Array.isArray(entry.profile)
    ? entry.profile
    : null;
}

function privateCharacter(privateData,name){
  const entry=privateData && privateData.characters && privateData.characters[name];
  const profile=privateProfile(entry);
  return profile ? {entry,profile} : null;
}

function privateMediaDefault(name){
  return {src:"",alt:name,source:"local",credit:""};
}

function resolveCharacterMediaTarget(mediaData,privateData,character,requestedTarget){
  const hasPublic=Object.prototype.hasOwnProperty.call(mediaData || {},character);
  const privateTarget=privateCharacter(privateData,character);
  const hasPrivate=!!privateTarget;
  const requested=requestedTarget === "private" || requestedTarget === "public"
    ? requestedTarget
    : "auto";

  if(requested === "public"){
    if(!hasPublic){
      const error=new Error("A ficha pública deste personagem não possui uma camada de mídia.");
      error.status=404;
      error.code="public_character_media_not_found";
      throw error;
    }
    return {kind:"public",privateTarget:null};
  }

  if(requested === "private"){
    if(!hasPrivate){
      const error=new Error("A ficha privada deste personagem não foi encontrada.");
      error.status=404;
      error.code="private_character_media_not_found";
      throw error;
    }
    return {kind:"private",privateTarget};
  }

  // Em colisões de mesmo nome (ex.: Camila Vargas), a ficha pública é a
  // identidade canônica visível e deve receber uploads iniciados pela ficha
  // normal. Perfis exclusivamente privados continuam usando o cofre.
  if(hasPublic) return {kind:"public",privateTarget:null};
  if(hasPrivate) return {kind:"private",privateTarget};

  const error=new Error("Personagem não encontrado na camada de mídia.");
  error.status=404;
  error.code="unknown_character";
  throw error;
}


const COMIC_STATUSES=new Set(["published","draft"]);
const COMIC_PATH_RE=/^images\/comics\/[a-z0-9._/-]+\.(png|jpe?g|webp)$/i;

function validComicPath(value){
  return COMIC_PATH_RE.test(String(value || "").trim());
}

function safeComicText(value,max=500){
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g,"").slice(0,max);
}

function normalizeComicPage(input,index){
  const row=input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const src=String(row.src || "").trim();
  if(!COMIC_PATH_RE.test(src)){
    const error=new Error("Caminho de página de quadrinho inválido.");
    error.status=400;
    error.code="invalid_comic_page_path";
    throw error;
  }
  const thumb=String(row.thumb || "").trim();
  return {
    order:index+1,
    label:safeComicText(row.label || ("Página "+(index+1)),120),
    src,
    ...(validComicPath(thumb) ? {thumb} : {}),
    alt:safeComicText(row.alt || "",240)
  };
}

function normalizeComicCatalog(data){
  const input=data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const source=Array.isArray(input.series) ? input.series : [];
  const seen=new Set();
  const series=[];

  source.forEach((raw,index)=>{
    if(!raw || typeof raw !== "object") return;
    let id=slugify(raw.id || raw.title || ("edicao-"+(index+1)));
    if(!id) id="edicao-"+(index+1);
    let base=id,suffix=2;
    while(seen.has(id)) id=base+"-"+suffix++;
    seen.add(id);
    const rawPages=Array.isArray(raw.pages) ? raw.pages : [];
    const pages=rawPages.map((page,pageIndex)=>normalizeComicPage(page,pageIndex));
    const cover=String(raw.cover || "").trim();
    series.push({
      id,
      title:safeComicText(raw.title || "Sem título",160),
      subtitle:safeComicText(raw.subtitle || "",160),
      collection:safeComicText(raw.collection || "Terra Omega",120),
      arc:safeComicText(raw.arc || "",120),
      issueNumber:Math.max(0,Math.min(9999,Number.parseInt(raw.issueNumber,10)||0)),
      publicationDate:safeComicText(raw.publicationDate || "",40),
      storyDate:safeComicText(raw.storyDate || "",80),
      description:safeComicText(raw.description || "",800),
      status:COMIC_STATUSES.has(raw.status) ? raw.status : "published",
      ...(validComicPath(cover) ? {cover} : {}),
      pages
    });
  });

  return {version:3,series};
}

function renderComicCatalog(catalog){
  return JSON.stringify(normalizeComicCatalog(catalog),null,2)+"\n";
}

function findComicEdition(catalog,id){
  const key=slugify(id || "");
  const index=(catalog.series || []).findIndex(row=>row && row.id===key);
  return {key,index,edition:index>=0?catalog.series[index]:null};
}

function uniqueComicId(title,collection,series){
  const base=slugify([collection,title].filter(Boolean).join("-")) || "quadrinho";
  const used=new Set((series || []).map(row=>String(row && row.id || "")));
  if(!used.has(base)) return base;
  let suffix=2;
  while(used.has(base+"-"+suffix)) suffix++;
  return base+"-"+suffix;
}

async function readComicCatalog(){
  const file=await readTextFile("data/comics.json");
  let parsed={series:[]};
  try{parsed=JSON.parse(file.content);}catch(error){
    const err=new Error("O catálogo de quadrinhos está inválido.");
    err.status=500;err.code="invalid_comics_catalog";throw err;
  }
  return normalizeComicCatalog(parsed);
}

function nextComicPagePaths(edition,extension){
  const folder=slugify(edition.collection || "quadrinhos") || "quadrinhos";
  let highest=0;
  (edition.pages || []).forEach(page=>{
    const match=String(page.src || "").match(/-(\d+)\.[a-z0-9]+$/i);
    if(match) highest=Math.max(highest,Number(match[1])||0);
  });
  const number=String(highest+1).padStart(2,"0");
  const base="images/comics/"+folder+"/"+edition.id+"-"+number;
  return {page:base+"."+extension,thumb:base+"-thumb.webp"};
}

function comicCoverPath(edition){
  return "images/comics/covers/"+edition.id+".webp";
}

function decodeComicImage(value,mime,maxBytes=MAX_BYTES){
  const normalizedMime=String(mime || "").toLowerCase();
  if(!EXTENSIONS[normalizedMime]){
    const error=new Error("Use PNG, JPEG ou WebP.");
    error.status=400;error.code="invalid_media";throw error;
  }
  let encoded=String(value || "");
  const comma=encoded.indexOf(",");
  if(encoded.startsWith("data:") && comma>=0) encoded=encoded.slice(comma+1);
  encoded=encoded.replace(/\s+/g,"");
  const buffer=Buffer.from(encoded,"base64");
  if(!buffer.length || buffer.length>maxBytes){
    const error=new Error("A imagem otimizada excede o limite permitido.");
    error.status=413;error.code="image_too_large";throw error;
  }
  if(!validMagic(buffer,normalizedMime)){
    const error=new Error("O conteúdo da imagem não corresponde ao formato informado.");
    error.status=400;error.code="invalid_image";throw error;
  }
  return {buffer,mime:normalizedMime,extension:EXTENSIONS[normalizedMime]};
}

function comicResult(req,commit,catalog,extra={}){
  return {
    ok:true,
    sha:commit.sha,
    catalog,
    status_url:statusUrl(req,commit.sha),
    ...extra
  };
}

const LIBRARY_CATEGORIES=new Set(["portrait","graph","map","editorial","team","other"]);

function normalizeLibraryAsset(input,existing,id){
  const source=input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const previous=existing && typeof existing === "object" ? existing : {};
  const label=safeDcText(source.label || previous.label || id,160);
  const category=LIBRARY_CATEGORIES.has(source.category)
    ? source.category
    : (LIBRARY_CATEGORIES.has(previous.category) ? previous.category : "other");
  const sourceType=(source.source==="external" || source.source==="local")
    ? source.source
    : (previous.source==="external" ? "external" : "local");
  let src=String(source.src !== undefined ? source.src : (previous.src || "")).trim();

  if(sourceType==="external"){
    src=safeHttpsUrl(src,1600);
    if(!src){
      const error=new Error("Informe uma URL HTTPS válida para o ativo externo.");
      error.status=400;
      error.code="invalid_library_url";
      throw error;
    }
  }else if(src && !/^images\/library\/[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(src)){
    const error=new Error("Caminho local inválido para a Biblioteca de Mídia.");
    error.status=400;
    error.code="invalid_library_path";
    throw error;
  }

  return {
    id,
    label,
    category,
    src,
    source:sourceType,
    alt:safeDcText(source.alt !== undefined ? source.alt : (previous.alt || label),180),
    credit:safeDcText(source.credit !== undefined ? source.credit : (previous.credit || ""),240),
    framing:normalizeFramingPreset(source.framing || previous.framing),
    createdAt:String(previous.createdAt || source.createdAt || new Date().toISOString()),
    updatedAt:new Date().toISOString()
  };
}

function normalizeLibrary(data){
  const input=data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const assets=Array.isArray(input.assets) ? input.assets : [];
  return {
    version:1,
    assets:assets.filter(asset=>asset && asset.id).slice(0,1000)
  };
}

function uniqueLibraryId(label,assets,currentId){
  const base=slugify(label || "midia") || "midia";
  const used=new Set((assets || []).map(asset=>String(asset && asset.id || "")).filter(Boolean));
  if(currentId) used.delete(currentId);
  if(!used.has(base)) return base;
  let suffix=2;
  while(used.has(base+"-"+suffix)) suffix++;
  return base+"-"+suffix;
}

export default async function handler(req,res){
  if(applyCors(req,res)) return;

  if(req.method === "GET"){
    if(String((req.query || {}).dc || "") === "1"){
      return handleDcPortrait(req,res);
    }

    if(String((req.query || {}).external || "") === "1"){
      return handleExternalPortrait(req,res);
    }

    const path = String((req.query || {}).path || "");
    if(!/^images\/(?:characters|library)\/[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(path)){
      return res.status(400).json({error:"invalid_media_path"});
    }

    try {
      const file = await readBinaryFile(path);
      const ext = path.split(".").pop().toLowerCase();
      res.setHeader("Content-Type",MIME_BY_EXT[ext] || "application/octet-stream");
      res.setHeader("Cache-Control","public, max-age=60, s-maxage=60");
      return res.status(200).send(file.buffer);
    } catch(error){
      console.error(error);
      return res.status(error.status || 404).end();
    }
  }

  if(req.method !== "POST" && req.method !== "DELETE"){
    res.setHeader("Allow","GET, POST, DELETE, OPTIONS");
    return res.status(405).json({error:"method_not_allowed"});
  }

  if(!requireEditor(req,res)) return;

  try {
    const requestBody = req.body || {};

    if(req.method === "POST" && String(requestBody.action || "").startsWith("comic-")){
      const action=String(requestBody.action || "");
      const head=await getHead();
      const catalog=await readComicCatalog();

      if(action === "comic-save"){
        const requested=slugify(requestBody.id || "");
        const found=findComicEdition(catalog,requested);
        const title=safeComicText(requestBody.title,160);
        if(!title) return res.status(400).json({error:"missing_comic_title",message:"Informe o título da edição."});

        const collection=safeComicText(requestBody.collection || "Terra Omega",120) || "Terra Omega";
        const id=found.edition ? found.edition.id : uniqueComicId(title,collection,catalog.series);
        const edition={
          id,
          title,
          subtitle:safeComicText(requestBody.subtitle,160),
          collection,
          arc:safeComicText(requestBody.arc,120),
          issueNumber:Math.max(0,Math.min(9999,Number.parseInt(requestBody.issueNumber,10)||0)),
          publicationDate:safeComicText(requestBody.publicationDate,40),
          storyDate:safeComicText(requestBody.storyDate,80),
          description:safeComicText(requestBody.description,800),
          status:COMIC_STATUSES.has(requestBody.status) ? requestBody.status : "draft",
          ...(found.edition && found.edition.cover ? {cover:found.edition.cover} : {}),
          pages:found.edition ? found.edition.pages : []
        };

        if(found.index>=0) catalog.series[found.index]=edition;
        else catalog.series.push(edition);

        const commit=await commitFiles(
          [{path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}],
          found.edition ? ("comics: atualizar "+edition.title) : ("comics: criar "+edition.title),
          head
        );
        return res.status(200).json(comicResult(req,commit,catalog,{edition}));
      }

      if(action === "comic-delete"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});

        const files=[];
        const managedPaths=new Set();
        for(const page of found.edition.pages || []){
          [page.src,page.thumb].filter(validComicPath).forEach(path=>managedPaths.add(path));
        }
        if(validComicPath(found.edition.cover)) managedPaths.add(found.edition.cover);
        for(const path of managedPaths){
          try{
            await readBinaryFile(path);
            files.push({path,delete:true});
          }catch(error){
            if(!error || error.status!==404) throw error;
          }
        }
        catalog.series.splice(found.index,1);
        files.push({path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"});
        const commit=await commitFiles(files,"comics: excluir "+found.edition.title,head);
        return res.status(200).json(comicResult(req,commit,catalog,{deleted:found.edition.id}));
      }

      if(action === "comic-page-upload"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Salve a edição antes de adicionar páginas."});

        const main=decodeComicImage(requestBody.contentBase64,requestBody.mimeType,MAX_BYTES);
        const thumb=decodeComicImage(requestBody.thumbnailBase64 || requestBody.contentBase64,requestBody.thumbnailMimeType || requestBody.mimeType,600*1024);
        if(thumb.mime!=="image/webp"){
          return res.status(400).json({error:"invalid_comic_thumbnail",message:"Miniaturas de quadrinhos devem ser WebP."});
        }

        const replaceSrc=String(requestBody.replaceSrc || "").trim();
        let pagePath="";
        let thumbPath="";
        let pageIndex=-1;
        const files=[];

        if(replaceSrc){
          pageIndex=found.edition.pages.findIndex(page=>page && page.src===replaceSrc);
          if(pageIndex<0) return res.status(404).json({error:"comic_page_not_found",message:"Página a substituir não encontrada."});
          const old=found.edition.pages[pageIndex];
          const base=old.src.replace(/\.[a-z0-9]+$/i,"").replace(/-thumb$/i,"");
          pagePath=base+"."+main.extension;
          thumbPath=base+"-thumb.webp";
          for(const oldPath of [old.src,old.thumb]){
            if(validComicPath(oldPath) && oldPath!==pagePath && oldPath!==thumbPath){
              try{await readBinaryFile(oldPath);files.push({path:oldPath,delete:true});}catch(error){if(!error||error.status!==404)throw error;}
            }
          }
          found.edition.pages[pageIndex]={
            order:pageIndex+1,
            label:safeComicText(requestBody.label || old.label || ("Página "+(pageIndex+1)),120),
            src:pagePath,
            thumb:thumbPath,
            alt:safeComicText(requestBody.alt || old.alt || "",240)
          };
        }else{
          const paths=nextComicPagePaths(found.edition,main.extension);
          pagePath=paths.page;
          thumbPath=paths.thumb;
          pageIndex=found.edition.pages.length;
          found.edition.pages.push({
            order:pageIndex+1,
            label:safeComicText(requestBody.label || ("Página "+(pageIndex+1)),120),
            src:pagePath,
            thumb:thumbPath,
            alt:safeComicText(requestBody.alt || "",240)
          });
        }

        files.push({path:pagePath,content:main.buffer.toString("base64"),encoding:"base64"});
        files.push({path:thumbPath,content:thumb.buffer.toString("base64"),encoding:"base64"});
        files.push({path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"});
        const commit=await commitFiles(
          files,
          replaceSrc ? ("comics: substituir página de "+found.edition.title) : ("comics: adicionar página a "+found.edition.title),
          head
        );
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition,page:found.edition.pages[pageIndex]}));
      }

      if(action === "comic-page-thumbnail"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});
        const src=String(requestBody.src || "").trim();
        const index=found.edition.pages.findIndex(page=>page && page.src===src);
        if(index<0) return res.status(404).json({error:"comic_page_not_found",message:"Página não encontrada."});
        const thumb=decodeComicImage(requestBody.thumbnailBase64,"image/webp",600*1024);
        const base=src.replace(/\.[a-z0-9]+$/i,"").replace(/-thumb$/i,"");
        const thumbPath=base+"-thumb.webp";
        found.edition.pages[index]={...found.edition.pages[index],thumb:thumbPath};
        const commit=await commitFiles(
          [
            {path:thumbPath,content:thumb.buffer.toString("base64"),encoding:"base64"},
            {path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}
          ],
          "comics: gerar miniatura de "+found.edition.title,
          head
        );
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition}));
      }

      if(action === "comic-page-delete"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});
        const src=String(requestBody.src || "").trim();
        const index=found.edition.pages.findIndex(page=>page && page.src===src);
        if(index<0) return res.status(404).json({error:"comic_page_not_found",message:"Página não encontrada."});

        const removed=found.edition.pages[index];
        found.edition.pages.splice(index,1);
        found.edition.pages=found.edition.pages.map((page,i)=>({...page,order:i+1,label:page.label||("Página "+(i+1))}));
        const files=[{path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}];
        for(const path of [src,removed && removed.thumb]){
          if(validComicPath(path)){
            try{await readBinaryFile(path);files.unshift({path,delete:true});}catch(error){if(!error||error.status!==404)throw error;}
          }
        }
        const commit=await commitFiles(files,"comics: remover página de "+found.edition.title,head);
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition}));
      }

      if(action === "comic-pages-update"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});
        const incoming=Array.isArray(requestBody.pages)?requestBody.pages:[];
        const existing=new Set(found.edition.pages.map(page=>page.src));
        if(incoming.length!==found.edition.pages.length || incoming.some(page=>!page||!existing.has(String(page.src||"")))){
          return res.status(400).json({error:"invalid_comic_pages",message:"A lista de páginas não corresponde à edição atual."});
        }
        const unique=new Set(incoming.map(page=>String(page.src||"")));
        if(unique.size!==incoming.length){
          return res.status(400).json({error:"duplicate_comic_pages",message:"Uma página foi repetida na ordenação."});
        }

        const existingBySrc=new Map(found.edition.pages.map(page=>[page.src,page]));
        found.edition.pages=incoming.map((page,index)=>{
          const existingPage=existingBySrc.get(String(page.src || "")) || {};
          return normalizeComicPage({
            src:page.src,
            thumb:existingPage.thumb || "",
            label:page.label || ("Página "+(index+1)),
            alt:page.alt || ""
          },index);
        });

        const commit=await commitFiles(
          [{path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}],
          "comics: reorganizar páginas de "+found.edition.title,
          head
        );
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition}));
      }

      if(action === "comic-cover-upload"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});
        const image=decodeComicImage(requestBody.contentBase64,requestBody.mimeType,MAX_BYTES);
        if(image.mime!=="image/webp"){
          return res.status(400).json({error:"invalid_comic_cover",message:"Capas de quadrinhos devem ser WebP."});
        }
        const coverPath=comicCoverPath(found.edition);
        const files=[];
        if(validComicPath(found.edition.cover) && found.edition.cover!==coverPath){
          try{await readBinaryFile(found.edition.cover);files.push({path:found.edition.cover,delete:true});}catch(error){if(!error||error.status!==404)throw error;}
        }
        found.edition.cover=coverPath;
        files.push({path:coverPath,content:image.buffer.toString("base64"),encoding:"base64"});
        files.push({path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"});
        const commit=await commitFiles(files,"comics: atualizar capa de "+found.edition.title,head);
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition}));
      }

      if(action === "comic-cover-delete"){
        const found=findComicEdition(catalog,requestBody.id);
        if(!found.edition) return res.status(404).json({error:"comic_not_found",message:"Edição não encontrada."});
        const cover=found.edition.cover;
        delete found.edition.cover;
        const files=[{path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}];
        if(validComicPath(cover)){
          try{await readBinaryFile(cover);files.unshift({path:cover,delete:true});}catch(error){if(!error||error.status!==404)throw error;}
        }
        const commit=await commitFiles(files,"comics: remover capa de "+found.edition.title,head);
        return res.status(200).json(comicResult(req,commit,catalog,{edition:found.edition}));
      }

      if(action === "comic-editions-reorder"){
        const ids=Array.isArray(requestBody.ids)?requestBody.ids.map(slugify):[];
        const existing=catalog.series.map(row=>row.id);
        if(ids.length!==existing.length || new Set(ids).size!==ids.length || ids.some(id=>existing.indexOf(id)===-1)){
          return res.status(400).json({error:"invalid_comic_order",message:"A ordenação das edições está incompleta."});
        }
        const byId=new Map(catalog.series.map(row=>[row.id,row]));
        catalog.series=ids.map(id=>byId.get(id));
        const commit=await commitFiles(
          [{path:"data/comics.json",content:renderComicCatalog(catalog),encoding:"utf-8"}],
          "comics: reorganizar edições",
          head
        );
        return res.status(200).json(comicResult(req,commit,catalog));
      }

      return res.status(400).json({error:"unknown_comic_action",message:"Ação de quadrinhos desconhecida."});
    }

    if(req.method === "POST" && (
      requestBody.action === "library-upsert" ||
      requestBody.action === "library-upload" ||
      requestBody.action === "library-delete"
    )){
      const action=requestBody.action;
      const head=await getHead();
      const libraryFile=await readTextFile("data/media-library.js");
      const library=normalizeLibrary(parseDataAssignment(libraryFile.content,"mediaLibrary"));
      const requestedId=slugify(requestBody.id || "");
      const index=library.assets.findIndex(asset=>asset && asset.id===requestedId);
      const existing=index>=0 ? library.assets[index] : null;

      if(existing && existing.readOnly===true){
        return res.status(409).json({
          error:"library_asset_read_only",
          message:"Este ativo pertence ao acervo estrutural do projeto e não pode ser alterado pela Biblioteca."
        });
      }

      if(action === "library-delete"){
        if(!requestedId || !existing){
          return res.status(404).json({error:"library_asset_not_found",message:"Ativo de mídia não encontrado."});
        }

        library.assets.splice(index,1);
        const files=[
          {path:"data/media-library.js",content:renderMediaLibrary(library),encoding:"utf-8"}
        ];
        const previousPath=String(existing.src || "");
        if(existing.source==="local" && /^images\/library\/[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(previousPath)){
          try{
            await readBinaryFile(previousPath);
            files.push({path:previousPath,delete:true});
          }catch(error){
            if(!error || error.status!==404) throw error;
          }
        }

        const commit=await commitFiles(files,"media: excluir ativo "+(existing.label || existing.id),head);
        return res.status(200).json({
          ok:true,sha:commit.sha,deleted:existing.id,
          library,status_url:statusUrl(req,commit.sha)
        });
      }

      let id=requestedId || uniqueLibraryId(requestBody.label,library.assets,"");
      if(!existing && library.assets.some(asset=>asset.id===id)){
        id=uniqueLibraryId(requestBody.label,library.assets,"");
      }

      let asset;
      const files=[];

      if(action === "library-upload"){
        const mime=String(requestBody.mimeType || "").toLowerCase();
        const extension=EXTENSIONS[mime];
        if(!extension){
          return res.status(400).json({error:"invalid_media",message:"Use PNG, JPEG ou WebP."});
        }

        let encoded=String(requestBody.contentBase64 || "");
        const comma=encoded.indexOf(",");
        if(encoded.startsWith("data:") && comma>=0) encoded=encoded.slice(comma+1);
        encoded=encoded.replace(/\s+/g,"");
        const buffer=Buffer.from(encoded,"base64");

        if(!buffer.length || buffer.length>MAX_BYTES){
          return res.status(413).json({error:"image_too_large",message:"A imagem deve ter no máximo 2 MB."});
        }
        if(!validMagic(buffer,mime)){
          return res.status(400).json({error:"invalid_image",message:"O conteúdo do arquivo não corresponde ao formato informado."});
        }

        const imagePath="images/library/"+id+"."+extension;
        asset=normalizeLibraryAsset({
          ...requestBody,
          source:"local",
          src:imagePath
        },existing,id);

        if(existing && existing.source==="local" && existing.src && existing.src!==imagePath &&
           /^images\/library\/[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(existing.src)){
          try{
            await readBinaryFile(existing.src);
            files.push({path:existing.src,delete:true});
          }catch(error){
            if(!error || error.status!==404) throw error;
          }
        }

        files.push({path:imagePath,content:buffer.toString("base64"),encoding:"base64"});
      }else{
        asset=normalizeLibraryAsset(requestBody,existing,id);
      }

      if(index>=0) library.assets[index]=asset;
      else library.assets.push(asset);
      library.assets.sort((a,b)=>String(a.label||"").localeCompare(String(b.label||""),"pt-BR"));

      files.push({path:"data/media-library.js",content:renderMediaLibrary(library),encoding:"utf-8"});
      const commit=await commitFiles(
        files,
        existing ? ("media: atualizar ativo "+asset.label) : ("media: criar ativo "+asset.label),
        head
      );

      return res.status(200).json({
        ok:true,sha:commit.sha,asset,library,
        status_url:statusUrl(req,commit.sha)
      });
    }

    if(req.method === "POST" && requestBody.action === "configure-display"){
      const character=String(requestBody.character || "").trim();
      if(!character){
        return res.status(400).json({error:"missing_character",message:"Personagem não informado."});
      }

      const head=await getHead();
      const [mediaFile,privateData]=await Promise.all([
        readTextFile("data/character-media.js"),
        readPrivateCharacterData()
      ]);
      const mediaData=parseDataAssignment(mediaFile.content,"characterMedia");
      privateData.characters=privateData.characters && typeof privateData.characters === "object"
        ? privateData.characters
        : {};
      const mediaTarget=resolveCharacterMediaTarget(
        mediaData,
        privateData,
        character,
        requestBody.target
      );
      const privateTarget=mediaTarget.privateTarget;

      const framing=normalizePortraitFraming(requestBody.framing);

      if(mediaTarget.kind === "private"){
        const current=privateTarget.profile.media && typeof privateTarget.profile.media === "object"
          ? privateTarget.profile.media
          : privateMediaDefault(character);
        privateTarget.profile.media={...current,framing};

        const commit=await commitFiles(
          [{
            path:PRIVATE_CHARACTER_DATA_PATH,
            content:renderPrivateCharacterData(privateData),
            encoding:"utf-8"
          }],
          "media: ajustar enquadramento privado de " + character,
          head
        );

        return res.status(200).json({
          ok:true,
          sha:commit.sha,
          character,
          media:privateTarget.profile.media,
          private:true,
          status_url:statusUrl(req,commit.sha)
        });
      }

      const current=mediaData[character] && typeof mediaData[character] === "object"
        ? mediaData[character]
        : privateMediaDefault(character);
      mediaData[character]={...current,framing};

      const commit=await commitFiles(
        [{
          path:"data/character-media.js",
          content:renderCharacterMedia(mediaData),
          encoding:"utf-8"
        }],
        "media: ajustar enquadramento de " + character,
        head
      );

      return res.status(200).json({
        ok:true,
        sha:commit.sha,
        character,
        media:mediaData[character],
        status_url:statusUrl(req,commit.sha)
      });
    }

    if(req.method === "POST" && requestBody.action === "configure-source"){
      const character=String(requestBody.character || "").trim();
      if(!character){
        return res.status(400).json({error:"missing_character",message:"Personagem não informado."});
      }

      const head=await getHead();
      const [mediaFile,privateData]=await Promise.all([
        readTextFile("data/character-media.js"),
        readPrivateCharacterData()
      ]);
      const mediaData=parseDataAssignment(mediaFile.content,"characterMedia");
      privateData.characters=privateData.characters && typeof privateData.characters === "object"
        ? privateData.characters
        : {};
      const mediaTarget=resolveCharacterMediaTarget(
        mediaData,
        privateData,
        character,
        requestBody.target
      );
      const privateTarget=mediaTarget.privateTarget;

      const auto=normalizeAutoSource(requestBody);

      if(mediaTarget.kind === "private"){
        const current=privateTarget.profile.media && typeof privateTarget.profile.media === "object"
          ? privateTarget.profile.media
          : privateMediaDefault(character);

        privateTarget.profile.media={
          ...current,
          src:"",
          source:auto ? "auto" : "local"
        };
        if(auto) privateTarget.profile.media.auto=auto;
        else delete privateTarget.profile.media.auto;
        delete privateTarget.profile.privatePortrait;

        const commit=await commitFiles(
          [{
            path:PRIVATE_CHARACTER_DATA_PATH,
            content:renderPrivateCharacterData(privateData),
            encoding:"utf-8"
          }],
          "media: atualizar fonte privada de retrato de " + character,
          head
        );

        return res.status(200).json({
          ok:true,
          sha:commit.sha,
          character,
          media:privateTarget.profile.media,
          private:true,
          status_url:statusUrl(req,commit.sha)
        });
      }

      const current=mediaData[character] && typeof mediaData[character] === "object"
        ? mediaData[character]
        : privateMediaDefault(character);

      mediaData[character]={
        ...current,
        source:current.src ? "local" : (auto ? "auto" : "local")
      };

      if(auto) mediaData[character].auto=auto;
      else delete mediaData[character].auto;

      const commit=await commitFiles(
        [{
          path:"data/character-media.js",
          content:renderCharacterMedia(mediaData),
          encoding:"utf-8"
        }],
        "media: atualizar fonte de retrato de " + character,
        head
      );

      return res.status(200).json({
        ok:true,
        sha:commit.sha,
        character,
        media:mediaData[character],
        status_url:statusUrl(req,commit.sha)
      });
    }

    if(req.method === "DELETE"){
      const body = req.body || {};
      const character = String(body.character || "").trim();

      if(!character){
        return res.status(400).json({error:"missing_character",message:"Personagem não informado."});
      }

      const head = await getHead();
      const [mediaFile,privateData] = await Promise.all([
        readTextFile("data/character-media.js"),
        readPrivateCharacterData()
      ]);
      const mediaData = parseDataAssignment(mediaFile.content,"characterMedia");
      privateData.characters=privateData.characters && typeof privateData.characters === "object"
        ? privateData.characters
        : {};
      const mediaTarget=resolveCharacterMediaTarget(
        mediaData,
        privateData,
        character,
        body.target
      );
      const privateTarget=mediaTarget.privateTarget;

      if(mediaTarget.kind === "private"){
        const current=privateTarget.profile.media && typeof privateTarget.profile.media === "object"
          ? privateTarget.profile.media
          : privateMediaDefault(character);
        const hadPortrait=!!privateTarget.profile.privatePortrait || !!current.src;

        if(!hadPortrait){
          return res.status(409).json({error:"no_portrait",message:"Este personagem não possui retrato para remover."});
        }

        privateTarget.profile.media={
          ...current,
          src:"",
          source:current.auto ? "auto" : "local",
          credit:""
        };
        delete privateTarget.profile.privatePortrait;

        const commit=await commitFiles(
          [{
            path:PRIVATE_CHARACTER_DATA_PATH,
            content:renderPrivateCharacterData(privateData),
            encoding:"utf-8"
          }],
          "media: remover retrato privado de " + character,
          head
        );

        return res.status(200).json({
          ok:true,
          sha:commit.sha,
          character,
          private:true,
          status_url:statusUrl(req,commit.sha)
        });
      }

      const previousPath = mediaData[character] && mediaData[character].src
        ? String(mediaData[character].src)
        : "";

      if(!previousPath){
        return res.status(409).json({error:"no_portrait",message:"Este personagem não possui retrato para remover."});
      }

      mediaData[character] = {
        ...mediaData[character],
        src:"",
        source:mediaData[character] && mediaData[character].auto ? "auto" : "local",
        credit:""
      };

      const files = [
        {
          path:"data/character-media.js",
          content:renderCharacterMedia(mediaData),
          encoding:"utf-8"
        }
      ];

      if(/^images\/characters\/[a-z0-9._-]+\.(png|jpe?g|webp)$/i.test(previousPath)){
        try {
          await readBinaryFile(previousPath);
          files.push({path:previousPath,delete:true});
        } catch(error){
          if(!error || error.status !== 404) throw error;
        }
      }

      const commit = await commitFiles(
        files,
        "media: remover retrato de " + character,
        head
      );

      return res.status(200).json({
        ok:true,
        sha:commit.sha,
        character,
        status_url:statusUrl(req,commit.sha)
      });
    }
    const body = req.body || {};
    const character = String(body.character || "").trim();
    const mime = String(body.mimeType || "").toLowerCase();
    const extension = EXTENSIONS[mime];

    if(!character || !extension){
      return res.status(400).json({error:"invalid_media",message:"Personagem ou formato de imagem inválido."});
    }

    let encoded = String(body.contentBase64 || "");
    const comma = encoded.indexOf(",");
    if(encoded.startsWith("data:") && comma >= 0) encoded = encoded.slice(comma+1);
    encoded = encoded.replace(/\s+/g,"");

    const buffer = Buffer.from(encoded,"base64");
    if(!buffer.length || buffer.length > MAX_BYTES){
      return res.status(413).json({error:"image_too_large",message:"A imagem deve ter no máximo 2 MB."});
    }
    if(!validMagic(buffer,mime)){
      return res.status(400).json({error:"invalid_image",message:"O conteúdo do arquivo não corresponde ao formato informado."});
    }

    const head = await getHead();
    const [mediaFile,privateData] = await Promise.all([
      readTextFile("data/character-media.js"),
      readPrivateCharacterData()
    ]);
    const mediaData = parseDataAssignment(mediaFile.content,"characterMedia");
    privateData.characters=privateData.characters && typeof privateData.characters === "object"
      ? privateData.characters
      : {};
    const mediaTarget=resolveCharacterMediaTarget(
      mediaData,
      privateData,
      character,
      body.target
    );
    const privateTarget=mediaTarget.privateTarget;

    if(mediaTarget.kind === "private"){
      privateTarget.profile.media={
        ...(privateTarget.profile.media && typeof privateTarget.profile.media === "object"
          ? privateTarget.profile.media
          : privateMediaDefault(character)),
        src:"",
        alt:String(body.alt || character).slice(0,160),
        source:"private",
        credit:String(body.credit || "").slice(0,240)
      };
      privateTarget.profile.privatePortrait={
        mime,
        dataBase64:buffer.toString("base64")
      };

      const commit=await commitFiles(
        [{
          path:PRIVATE_CHARACTER_DATA_PATH,
          content:renderPrivateCharacterData(privateData),
          encoding:"utf-8"
        }],
        "media: atualizar retrato privado de " + character,
        head
      );

      return res.status(200).json({
        ok:true,
        sha:commit.sha,
        private:true,
        status_url:statusUrl(req,commit.sha)
      });
    }

    const filename = slugify(character) + "." + extension;
    const imagePath = "images/characters/" + filename;
    const previousPath = mediaData[character] && mediaData[character].src
      ? String(mediaData[character].src)
      : "";

    mediaData[character] = {
      ...mediaData[character],
      src:imagePath,
      alt:String(body.alt || character).slice(0,160),
      source:"local",
      credit:String(body.credit || "").slice(0,240)
    };

    const files = [
      {path:imagePath,content:buffer.toString("base64"),encoding:"base64"},
      {path:"data/character-media.js",content:renderCharacterMedia(mediaData),encoding:"utf-8"}
    ];

    if(previousPath &&
       previousPath !== imagePath &&
       /^images\/characters\/[a-z0-9._/-]+$/i.test(previousPath)){
      files.push({path:previousPath,delete:true});
    }

    const commit = await commitFiles(
      files,
      "media: atualizar retrato de " + character,
      head
    );

    return res.status(200).json({
      ok:true,
      sha:commit.sha,
      path:imagePath,
      status_url:statusUrl(req,commit.sha)
    });
  } catch(error){
    console.error(error);
    return res.status(error.status || 500).json({
      error:error.code || "media_publish_failed",
      message:error.status ? error.message : "Falha ao publicar a imagem."
    });
  }
}
