(function(){
"use strict";

window.TerraOmegaApp=window.TerraOmegaApp||{};

var catalog=null;
var editions=[];
var seriesIndex=0;
var pageIndex=0;
var mounted=false;
var loadingPromise=null;
var activeCollection="";
var viewMode="single";
var fitMode="auto";
var customZoom=1;
var thumbsVisible=true;
var readingMode=false;
var focusReturn=null;
var lazyObserver=null;
var continuousObserver=null;
var chromeTimer=null;
var dragState=null;
var touchState=null;
var pinchState=null;
var pageTurnAnimating=false;
var pageTurnEnabled=true;
var preloadedPageImages=new Map();
var assetRevision=Date.now();
var libraryReturnFocus=null;
var helpReturnFocus=null;

var VIEW_KEY="terraOmega_comic_view_v3";
var FIT_KEY="terraOmega_comic_fit_v3";
var THUMBS_KEY="terraOmega_comic_thumbs_v3";
var ZOOM_KEY="terraOmega_comic_zoom_v3";
var PROGRESS_KEY="terraOmega_comic_progress_v3";
var LAST_EDITION_KEY="terraOmega_comic_last_edition_v3";
var PAGE_TURN_KEY="terraOmega_comic_page_turn_v1";

function el(id){return document.getElementById(id);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function versionedPageSrc(value){
  var src=String(value||"");
  if(!/^images\/comics\//i.test(src))return src;
  return src+(src.indexOf("?")>=0?"&":"?")+"rev="+encodeURIComponent(String(assetRevision));
}
function esc(value){
  return String(value||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function loadValue(key,fallback){
  try{var value=localStorage.getItem(key);return value===null?fallback:value;}catch(error){return fallback;}
}
function saveValue(key,value){try{localStorage.setItem(key,String(value));}catch(error){}}
function loadJson(key,fallback){
  try{var value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch(error){return fallback;}
}
function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(error){}}

function focusableNodes(root){
  if(!root)return [];
  return Array.from(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
    .filter(function(node){return !node.hidden && node.offsetParent!==null;});
}
function trapFocus(event,root){
  if(event.key!=="Tab"||!root)return false;
  var nodes=focusableNodes(root);
  if(!nodes.length){event.preventDefault();return true;}
  var first=nodes[0],last=nodes[nodes.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();return true;}
  if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();return true;}
  return false;
}
function currentComicRoute(){
  var edition=currentSeries(),list=pages();
  if(!edition)return "/capa/quadrinhos";
  var page=list.length?clamp(pageIndex+1,1,list.length):1;
  return "/capa/quadrinhos/"+encodeURIComponent(edition.id)+"/"+page;
}
function syncComicRoute(options){
  options=options||{};
  var router=window.TerraOmegaApp&&window.TerraOmegaApp.router;
  var edition=currentSeries();
  if(!edition||!router)return;
  if(router.setComic){
    router.setComic(edition.id,pageIndex+1,{
      replace:options.replace!==false,
      title:edition.title
    });
  }
}

function hydratePreferences(){
  var savedView=loadValue(VIEW_KEY,"single");
  if(["single","spread","continuous"].indexOf(savedView)!==-1)viewMode=savedView;
  var savedFit=loadValue(FIT_KEY,"auto");
  if(["auto","screen","width","actual","custom"].indexOf(savedFit)!==-1)fitMode=savedFit;
  customZoom=clamp(Number(loadValue(ZOOM_KEY,"1"))||1,.5,3);
  thumbsVisible=loadValue(THUMBS_KEY,"1")!=="0";
  pageTurnEnabled=loadValue(PAGE_TURN_KEY,"1")!=="0";

  if(viewMode==="spread"&&(fitMode==="actual"||fitMode==="custom")){
    fitMode="screen";
    customZoom=1;
    saveValue(FIT_KEY,fitMode);
    saveValue(ZOOM_KEY,customZoom);
  }
  if(window.innerWidth<720 && viewMode==="spread") viewMode="single";
}

function publishedEditions(data){
  var rows=data&&Array.isArray(data.series)?data.series:[];
  return rows.filter(function(row){return row&&row.status!=="draft";});
}
function currentSeries(){return editions[seriesIndex]||null;}
function pages(){
  var edition=currentSeries();
  return edition&&Array.isArray(edition.pages)?edition.pages:[];
}
function collections(){
  var seen=new Set(),out=[];
  editions.forEach(function(row){
    var name=String(row&&row.collection||"Terra Omega");
    if(!seen.has(name)){seen.add(name);out.push(name);}
  });
  return out;
}
function active(){var section=el("sub-capa-quadrinhos");return !!(section&&section.classList.contains("active"));}
function editionLabel(row){
  if(!row)return "Sem título";
  var issue=Number(row.issueNumber)||0;
  return (issue>0?("#"+String(issue).padStart(2,"0")+" · "):"")+(row.title||"Sem título");
}
function editionCover(row){
  if(!row)return "";
  if(row.cover)return row.cover;
  var first=row.pages&&row.pages[0];
  return first?(first.thumb||first.src||""):"";
}

function progressMap(){return loadJson(PROGRESS_KEY,{});}
function savedProgress(id){
  var map=progressMap();
  var row=map&&map[id];
  return row&&typeof row==="object"?row:null;
}
function saveProgress(){
  var edition=currentSeries(),list=pages();
  if(!edition||!list.length)return;
  var map=progressMap();
  map[edition.id]={
    page:clamp(pageIndex,0,list.length-1),
    total:list.length,
    updatedAt:Date.now(),
    finished:pageIndex>=list.length-1
  };
  saveJson(PROGRESS_KEY,map);
  saveValue(LAST_EDITION_KEY,edition.id);
}
function restoreProgressForCurrent(){
  var edition=currentSeries(),list=pages();
  if(!edition||!list.length){pageIndex=0;return;}
  var saved=savedProgress(edition.id);
  pageIndex=saved?clamp(Number(saved.page)||0,0,list.length-1):0;
}

function pageRange(){
  var list=pages();
  if(!list.length)return [];
  pageIndex=clamp(pageIndex,0,list.length-1);
  if(viewMode==="continuous")return list.map(function(_,i){return i;});
  if(viewMode==="spread"){
    if(pageIndex===0)return [0];
    var spreadStart=pageIndex%2===0?pageIndex-1:pageIndex;
    return [spreadStart,spreadStart+1].filter(function(i){return i<list.length;});
  }
  return [pageIndex];
}
function normalizeIndexForView(index){
  var list=pages();
  index=clamp(index,0,Math.max(0,list.length-1));
  if(viewMode==="spread"&&index>0)return index%2===0?index-1:index;
  return index;
}
function rangeLabel(indices){
  var list=pages();
  if(!indices.length||!list.length)return "—";
  if(viewMode==="continuous")return (pageIndex+1)+" / "+list.length;
  var first=indices[0]+1,last=indices[indices.length-1]+1;
  return (first===last?String(first):(first+"–"+last))+" / "+list.length;
}
function effectiveFit(){
  if(fitMode!=="auto")return fitMode;
  return viewMode==="continuous"?"width":"screen";
}
function reducedMotion(){
  return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
function pageTurnAvailable(){
  var fit=effectiveFit();
  return pageTurnEnabled&&!reducedMotion()&&viewMode==="spread"&&!focusReturn&&!pageTurnAnimating&&(fit==="screen"||fit==="width");
}
function updatePageTurnToggle(){
  var button=el("comicPageTurnToggleBtn");
  if(!button)return;
  var effective=pageTurnEnabled&&!reducedMotion();
  button.textContent=(effective?"✓ ":"○ ")+"Animação de página";
  button.setAttribute("aria-pressed",effective?"true":"false");
  button.title=reducedMotion()
    ?"Desativada porque o sistema está configurado para reduzir movimentos"
    :(pageTurnEnabled?"Desativar animação de virar página":"Ativar animação de virar página");
}
function setPageTurnEnabled(value){
  pageTurnEnabled=!!value;
  saveValue(PAGE_TURN_KEY,pageTurnEnabled?"1":"0");
  updatePageTurnToggle();
}

function setEmpty(message){
  var viewport=el("comicPagesViewport"),empty=el("comicReaderEmpty");
  if(viewport){viewport.hidden=true;viewport.innerHTML="";}
  if(empty){
    empty.hidden=false;
    var note=empty.querySelector("span");
    if(note&&message)note.textContent=message;
  }
}

function imageMarkup(item,index){
  var alt=item.alt||((currentSeries()&&currentSeries().title||"Quadrinho")+" — página "+(index+1));
  var continuous=viewMode==="continuous";
  var freshSrc=versionedPageSrc(item.src);
  var src=continuous?'data:image/gif;base64,R0lGODlhAQABAAAAACw=':esc(freshSrc);
  var dataSrc=continuous?' data-src="'+esc(freshSrc)+'"':"";
  return '<figure class="comic-page-frame'+(continuous?' comic-page-lazy':'')+'" data-comic-rendered-page="'+index+'">'+
    '<div class="comic-page-surface">'+
      '<img class="comic-page-image" src="'+src+'"'+dataSrc+' alt="'+esc(alt)+'" draggable="false" decoding="async">'+
    '</div>'+
    '<figcaption>Página '+(index+1)+'</figcaption>'+
  '</figure>';
}

function teardownObservers(){
  if(lazyObserver){lazyObserver.disconnect();lazyObserver=null;}
  if(continuousObserver){continuousObserver.disconnect();continuousObserver=null;}
}
function setupContinuousObservers(){
  teardownObservers();
  if(viewMode!=="continuous")return;
  var stage=el("comicReaderStage"),viewport=el("comicPagesViewport");
  if(!stage||!viewport)return;
  var frames=Array.from(viewport.querySelectorAll(".comic-page-frame"));

  if("IntersectionObserver" in window){
    lazyObserver=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting)return;
        var img=entry.target.querySelector("img[data-src]");
        if(img){img.src=img.getAttribute("data-src");img.removeAttribute("data-src");}
        lazyObserver.unobserve(entry.target);
      });
    },{root:stage,rootMargin:"1400px 0px",threshold:.01});
    frames.forEach(function(frame){lazyObserver.observe(frame);});

    continuousObserver=new IntersectionObserver(function(entries){
      var candidates=entries.filter(function(entry){return entry.isIntersecting;});
      if(!candidates.length)return;
      candidates.sort(function(a,b){
        var ar=Math.abs(a.boundingClientRect.top-stage.getBoundingClientRect().top-40);
        var br=Math.abs(b.boundingClientRect.top-stage.getBoundingClientRect().top-40);
        return ar-br;
      });
      var idx=Number(candidates[0].target.getAttribute("data-comic-rendered-page"));
      if(Number.isFinite(idx)&&idx!==pageIndex){
        pageIndex=idx;
        updateProgressUI();
        highlightThumbs();
        saveProgress();
      }
    },{root:stage,rootMargin:"-10% 0px -68% 0px",threshold:[0,.01,.25]});
    frames.forEach(function(frame){continuousObserver.observe(frame);});
  }else{
    viewport.querySelectorAll("img[data-src]").forEach(function(img){img.src=img.getAttribute("data-src");img.removeAttribute("data-src");});
  }
}

function applySizing(){
  var reader=el("comicReader"),viewport=el("comicPagesViewport");
  if(!reader||!viewport)return;
  var effective=effectiveFit();
  reader.setAttribute("data-view-mode",viewMode);
  reader.setAttribute("data-fit-mode",fitMode);
  reader.setAttribute("data-fit-effective",effective);
  viewport.style.setProperty("--comic-zoom",String(customZoom));

  viewport.querySelectorAll(".comic-page-image").forEach(function(image){
    image.style.width="";image.style.maxWidth="";image.style.maxHeight="";
    if(effective==="custom"){
      var apply=function(){if(image.naturalWidth)image.style.width=Math.round(image.naturalWidth*customZoom)+"px";};
      if(image.complete)apply();else image.addEventListener("load",apply,{once:true});
    }
  });

  var label=el("comicZoomLabel");
  if(label){
    if(fitMode==="auto")label.textContent="Auto";
    else if(effective==="screen")label.textContent="Tela";
    else if(effective==="width")label.textContent="Largura";
    else if(effective==="actual")label.textContent="100%";
    else label.textContent=Math.round(customZoom*100)+"%";
  }
  var fitSelect=el("comicFitSelect");
  if(fitSelect){
    if(fitMode!=="custom")fitSelect.value=fitMode;
    var actualOption=fitSelect.querySelector('option[value="actual"]');
    if(actualOption)actualOption.disabled=viewMode==="spread";
    fitSelect.title=viewMode==="spread"
      ?"No modo Livro, use Auto, Tela ou Largura para manter o enquadramento e a animação."
      :"Ajuste da página";
  }
  var zoomOut=el("comicZoomOutBtn"),zoomIn=el("comicZoomInBtn");
  [zoomOut,zoomIn].forEach(function(button){
    if(!button)return;
    button.disabled=viewMode==="spread";
    button.title=viewMode==="spread"
      ?"Zoom manual fica desativado no modo Livro para preservar o enquadramento e a virada."
      :(button===zoomOut?"Diminuir zoom":"Aumentar zoom");
  });
}

function renderSelectors(){
  var collectionSelect=el("comicCollectionSelect"),editionSelect=el("comicEditionSelect");
  var cols=collections();
  if(collectionSelect){
    collectionSelect.innerHTML=cols.length?cols.map(function(name){return '<option value="'+esc(name)+'">'+esc(name)+'</option>';}).join(""):'<option>Nenhuma coleção</option>';
    collectionSelect.disabled=!cols.length;
    if(activeCollection&&cols.indexOf(activeCollection)!==-1)collectionSelect.value=activeCollection;
  }

  if(editionSelect){
    var rows=editions.filter(function(row){return String(row.collection||"Terra Omega")===activeCollection;});
    editionSelect.innerHTML=rows.length?rows.map(function(row){
      var absolute=editions.indexOf(row);
      return '<option value="'+absolute+'">'+esc(editionLabel(row))+'</option>';
    }).join(""):'<option>Nenhuma edição</option>';
    editionSelect.disabled=!rows.length;
    if(rows.length)editionSelect.value=String(seriesIndex);
  }
}

function updateViewButtons(){
  document.querySelectorAll("[data-comic-view]").forEach(function(button){
    var on=button.getAttribute("data-comic-view")===viewMode;
    button.classList.toggle("active",on);button.setAttribute("aria-pressed",on?"true":"false");
  });
}
function updateThumbs(){
  var wrap=el("comicThumbsWrap"),button=el("comicThumbToggleBtn");
  if(wrap)wrap.hidden=!thumbsVisible;
  if(button){button.classList.toggle("active",thumbsVisible);button.setAttribute("aria-pressed",thumbsVisible?"true":"false");}
}
function highlightThumbs(){
  var root=el("comicThumbs");if(!root)return;
  var indices=viewMode==="continuous"?[pageIndex]:pageRange();
  root.querySelectorAll("[data-comic-page]").forEach(function(button){
    button.classList.toggle("active",indices.indexOf(Number(button.getAttribute("data-comic-page")))!==-1);
  });
  var activeThumb=root.querySelector(".comic-thumb.active");
  if(activeThumb&&thumbsVisible){
    var target=activeThumb.offsetLeft-(root.clientWidth-activeThumb.offsetWidth)/2;
    try{root.scrollTo({left:Math.max(0,target),behavior:"smooth"});}
    catch(error){root.scrollLeft=Math.max(0,target);}
  }
}
function renderThumbs(){
  var root=el("comicThumbs"),list=pages(),edition=currentSeries();
  if(!root)return;
  var thumbKey=(edition&&edition.id||"")+"|"+assetRevision+"|"+list.map(function(item){return item.thumb||item.src||"";}).join("|");
  if(root.getAttribute("data-thumb-key")!==thumbKey){
    root.innerHTML=list.map(function(item,index){
      var src=versionedPageSrc(item.thumb||item.src);
      return '<button type="button" class="comic-thumb" data-comic-page="'+index+'" data-page="'+(index+1)+'" aria-label="Abrir página '+(index+1)+'">'+
        '<img src="'+esc(src)+'" alt="" loading="lazy" decoding="async">'+
      '</button>';
    }).join("");
    root.setAttribute("data-thumb-key",thumbKey);
    root.querySelectorAll("[data-comic-page]").forEach(function(button){
      button.addEventListener("click",function(){goTo(Number(button.getAttribute("data-comic-page"))||0,true);});
    });
  }
  highlightThumbs();
}

function updateProgressUI(){
  var list=pages(),indices=pageRange();
  var label=el("comicPageLabel"),counter=el("comicPageCounter"),jump=el("comicPageJump");
  var fill=el("comicProgressFill"),text=el("comicProgressText");
  var current=list[pageIndex];

  if(label)label.textContent=current&&current.label?current.label:(list.length?("Página "+(pageIndex+1)):"Nenhuma página publicada");
  if(counter)counter.textContent=rangeLabel(indices);
  if(jump){jump.disabled=!list.length;jump.max=String(Math.max(1,list.length));jump.value=list.length?String(pageIndex+1):"";}
  var percent=list.length?Math.round(((pageIndex+1)/list.length)*100):0;
  if(fill)fill.style.width=percent+"%";
  if(text)text.textContent=list.length?("Página "+(pageIndex+1)+" de "+list.length+" · "+percent+"%"):"—";

  var atStart=pageIndex<=0;
  var lastIndex=list.length-1;
  var pairedEnd=viewMode==="spread"&&indices.indexOf(lastIndex)!==-1;
  var atEnd=!list.length||pageIndex>=lastIndex||pairedEnd;
  ["comicPrevBtn","comicFirstBtn","comicStagePrevBtn"].forEach(function(id){var b=el(id);if(b)b.disabled=atStart||!list.length;});
  ["comicNextBtn","comicLastBtn","comicStageNextBtn"].forEach(function(id){var b=el(id);if(b)b.disabled=atEnd;});
  var stagePrev=el("comicStagePrevBtn"),stageNext=el("comicStageNextBtn");
  if(stagePrev)stagePrev.hidden=viewMode==="continuous";
  if(stageNext)stageNext.hidden=viewMode==="continuous";
}

function render(){
  if(!catalog)return;
  var edition=currentSeries(),list=pages();
  var title=el("comicSeriesTitle"),collection=el("comicCollectionLabel"),desc=el("comicSeriesDescription");
  var viewport=el("comicPagesViewport"),empty=el("comicReaderEmpty");

  renderSelectors();
  if(title)title.textContent=edition&&edition.title?edition.title:"Terra Omega";
  if(collection){
    var arc=edition&&edition.arc?(" · "+edition.arc):"";
    collection.textContent=edition?(String(edition.collection||"Terra Omega")+arc):"Universo Oblívio";
  }
  if(desc)desc.textContent=edition&&edition.description?edition.description:"Arquivo de páginas sequenciais do Universo Oblívio.";

  if(!edition||!list.length){
    pageIndex=0;teardownObservers();
    setEmpty(edition?"Esta edição está pronta para receber páginas.":"Nenhuma edição de quadrinhos foi publicada ainda.");
    var thumbs=el("comicThumbs");if(thumbs)thumbs.innerHTML="";
    updateViewButtons();updateThumbs();updateProgressUI();applySizing();
    return;
  }

  pageIndex=clamp(pageIndex,0,list.length-1);
  var indices=pageRange();
  var readerNode=el("comicReader");
  if(readerNode){
    readerNode.classList.remove("comic-spread-single-right","comic-spread-single-left");
    if(viewMode==="spread"&&indices.length===1){
      readerNode.classList.add(((indices[0]+1)%2===1)?"comic-spread-single-right":"comic-spread-single-left");
    }
  }
  if(empty)empty.hidden=true;
  if(viewport){
    viewport.hidden=false;
    viewport.innerHTML=indices.map(function(index){return imageMarkup(list[index],index);}).join("");
    viewport.querySelectorAll(".comic-page-frame").forEach(function(frame){
      frame.addEventListener("dblclick",function(event){
        event.preventDefault();
        var idx=Number(frame.getAttribute("data-comic-rendered-page"));
        if(Number.isFinite(idx))togglePageFocus(idx);
      });
    });
  }

  updateViewButtons();updateThumbs();renderThumbs();updateProgressUI();applySizing();setupContinuousObservers();
  preloadAround();saveProgress();
}

function preloadPage(index,priority){
  var list=pages(),row=list[index];
  if(!row||!row.src)return null;
  var freshSrc=versionedPageSrc(row.src);
  if(preloadedPageImages.has(freshSrc))return preloadedPageImages.get(freshSrc);
  var img=new Image();
  var entry={img:img,ready:false,promise:null};
  img.decoding="async";
  try{img.fetchPriority=priority||"low";}catch(error){}
  img.addEventListener("load",function(){entry.ready=true;},{once:true});
  img.src=freshSrc;
  entry.promise=img.decode?img.decode().then(function(){entry.ready=true;}).catch(function(){}):Promise.resolve();
  preloadedPageImages.set(freshSrc,entry);
  while(preloadedPageImages.size>14){
    var first=preloadedPageImages.keys().next().value;
    if(!first)break;
    preloadedPageImages.delete(first);
  }
  return entry;
}
function preloadAround(){
  if(viewMode==="continuous")return;
  preloadPage(pageIndex+1,"high");
  preloadPage(pageIndex+2,"high");
  preloadPage(pageIndex+3,"low");
  preloadPage(pageIndex-1,"low");
  preloadPage(pageIndex-2,"low");
}

function goTo(index,scroll,options){
  options=options||{};
  var list=pages();if(!list.length)return;
  pageIndex=normalizeIndexForView(index);
  render();
  if(!options.silentRoute)syncComicRoute({replace:true});
  if(viewMode==="continuous"&&scroll){
    requestAnimationFrame(function(){
      var frame=document.querySelector('[data-comic-rendered-page="'+pageIndex+'"]');
      if(frame)frame.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }else if(scroll){
    var stage=el("comicReaderStage");if(stage)stage.scrollTo({top:0,left:0,behavior:"auto"});
  }
}

function spreadTarget(direction){
  var list=pages();
  if(!list.length)return pageIndex;
  if(direction>0){
    if(pageIndex===0)return Math.min(1,list.length-1);
    return Math.min(pageIndex+2,list.length-1);
  }
  if(pageIndex<=1)return 0;
  return Math.max(1,pageIndex-2);
}

function animateSpreadTurn(direction,targetIndex){
  var stage=el("comicReaderStage"),viewport=el("comicPagesViewport");
  if(!stage||!viewport||!pageTurnAvailable()){
    goTo(targetIndex,true);
    return;
  }

  var frames=Array.from(viewport.querySelectorAll(".comic-page-frame"));
  if(!frames.length){goTo(targetIndex,true);return;}
  var sourceFrame=direction>0?frames[frames.length-1]:frames[0];
  var sourceSurface=sourceFrame&&sourceFrame.querySelector(".comic-page-surface");
  var sourceImage=sourceFrame&&sourceFrame.querySelector(".comic-page-image");
  if(!sourceSurface||!sourceImage){goTo(targetIndex,true);return;}

  var imageRect=sourceSurface.getBoundingClientRect();
  var stageRect=stage.getBoundingClientRect();
  if(imageRect.width<20||imageRect.height<20){goTo(targetIndex,true);return;}

  var list=pages();
  var backIndex=direction>0?targetIndex:(targetIndex===0?0:Math.min(targetIndex+1,list.length-1));
  var backPage=list[backIndex]||null;
  var backSrc=backPage&&backPage.src?versionedPageSrc(backPage.src):"";
  preloadPage(backIndex,"high");

  pageTurnAnimating=true;
  var layer=document.createElement("div");
  layer.className="comic-page-turn-layer "+(direction>0?"is-forward":"is-backward");
  layer.setAttribute("aria-hidden","true");
  layer.style.left=(imageRect.left-stageRect.left+stage.scrollLeft)+"px";
  layer.style.top=(imageRect.top-stageRect.top+stage.scrollTop)+"px";
  layer.style.width=imageRect.width+"px";
  layer.style.height=imageRect.height+"px";
  layer.innerHTML=
    '<div class="comic-page-turn-cast-shadow"></div>'+
    '<div class="comic-page-turn-sheet">'+
      '<div class="comic-page-turn-bend">'+
        '<div class="comic-page-turn-face comic-page-turn-front">'+
          '<img src="'+esc(sourceImage.currentSrc||sourceImage.src)+'" alt="">'+
          '<span class="comic-page-turn-ridge"></span>'+
        '</div>'+
        '<div class="comic-page-turn-face comic-page-turn-back">'+
          (backSrc?'<img src="'+esc(backSrc)+'" alt="">':'')+
          '<span class="comic-page-turn-paper"></span>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="comic-page-turn-spine-shadow"></div>';
  stage.appendChild(layer);

  pageIndex=normalizeIndexForView(targetIndex);
  render();
  syncComicRoute({replace:true});

  var readerNode=el("comicReader");
  if(readerNode)readerNode.classList.add("comic-page-turning");

  requestAnimationFrame(function(){
    requestAnimationFrame(function(){layer.classList.add("is-turning");});
  });

  var finished=false;
  var cleanupTimer=null;
  function cleanup(){
    if(finished)return;
    finished=true;
    if(cleanupTimer)clearTimeout(cleanupTimer);
    layer.remove();
    pageTurnAnimating=false;
    var readerNode=el("comicReader");
    if(readerNode)readerNode.classList.remove("comic-page-turning");
    stage.scrollTo({top:0,left:0,behavior:"auto"});
  }
  var sheet=layer.querySelector(".comic-page-turn-sheet");
  var expectedTurnAnimation=direction>0?"comicPageTurnForward":"comicPageTurnBackward";
  if(sheet)sheet.addEventListener("animationend",function(event){
    if(event.target!==sheet||event.animationName!==expectedTurnAnimation)return;
    requestAnimationFrame(function(){
      requestAnimationFrame(cleanup);
    });
  });
  cleanupTimer=setTimeout(cleanup,1400);
}

function move(direction){
  var list=pages();if(!list.length||pageTurnAnimating)return;
  var step=1;
  if(viewMode==="spread"){
    var target=spreadTarget(direction);
    if(target===pageIndex)return;
    if(pageTurnAvailable())animateSpreadTurn(direction,target);
    else goTo(target,true);
    return;
  }
  goTo(pageIndex+(direction*step),true);
}

function cancelFocus(){
  if(!focusReturn)return;
  viewMode=focusReturn.view;fitMode=focusReturn.fit;customZoom=focusReturn.zoom;pageIndex=focusReturn.page;
  focusReturn=null;
  var reader=el("comicReader");if(reader)reader.classList.remove("comic-page-focus");
  var exit=el("comicFocusExitBtn");if(exit)exit.hidden=true;
}
function togglePageFocus(index){
  if(focusReturn){cancelFocus();render();return;}
  focusReturn={view:viewMode,fit:fitMode,zoom:customZoom,page:pageIndex};
  pageIndex=index;viewMode="single";fitMode="custom";customZoom=Math.max(1.25,customZoom);
  var reader=el("comicReader");if(reader)reader.classList.add("comic-page-focus");
  var exit=el("comicFocusExitBtn");if(exit)exit.hidden=false;
  render();
}

function setView(mode){
  if(["single","spread","continuous"].indexOf(mode)===-1)return;
  if(focusReturn)cancelFocus();
  viewMode=mode;
  if(viewMode==="spread"&&(fitMode==="actual"||fitMode==="custom")){
    fitMode="screen";
    customZoom=1;
    saveValue(FIT_KEY,fitMode);
    saveValue(ZOOM_KEY,customZoom);
  }
  pageIndex=normalizeIndexForView(pageIndex);
  saveValue(VIEW_KEY,viewMode);render();
}
function setFit(mode){
  if(["auto","screen","width","actual","custom"].indexOf(mode)===-1)return;
  if(viewMode==="spread"&&(mode==="actual"||mode==="custom"))mode="screen";
  fitMode=mode;if(mode==="actual")customZoom=1;
  saveValue(FIT_KEY,fitMode);saveValue(ZOOM_KEY,customZoom);applySizing();
}
function zoom(delta){
  if(viewMode==="spread")return;
  if(fitMode!=="custom")customZoom=fitMode==="actual"?1:1;
  fitMode="custom";customZoom=clamp(Math.round((customZoom+delta)*10)/10,.5,3);
  saveValue(FIT_KEY,fitMode);saveValue(ZOOM_KEY,customZoom);applySizing();
}

function chooseEdition(index,restore,options){
  options=options||{};
  seriesIndex=clamp(Number(index)||0,0,Math.max(0,editions.length-1));
  var row=currentSeries();
  activeCollection=row?String(row.collection||"Terra Omega"):"";
  if(restore!==false)restoreProgressForCurrent();else pageIndex=0;
  render();
  if(!options.silentRoute)syncComicRoute({replace:!!options.replace});
}
function chooseEditionById(id,restore,options){
  var found=editions.findIndex(function(row){return row&&row.id===id;});
  if(found>=0){chooseEdition(found,restore,options);return true;}
  return false;
}
function openRoute(id,page,options){
  options=options||{};
  var found=editions.findIndex(function(row){return row&&row.id===String(id||"");});
  if(found<0)return false;
  seriesIndex=found;
  var row=currentSeries();
  activeCollection=String(row.collection||"Terra Omega");
  var list=pages();
  if(Number.isFinite(Number(page))&&Number(page)>0)pageIndex=clamp(Number(page)-1,0,Math.max(0,list.length-1));
  else restoreProgressForCurrent();
  render();
  if(!options.fromRouter)syncComicRoute({replace:!!options.replace});
  else{
    var router=window.TerraOmegaApp&&window.TerraOmegaApp.router;
    if(router&&router.setComic)router.setComic(row.id,pageIndex+1,{replace:true,title:row.title});
  }
  return true;
}

function ensureLibrary(){
  if(el("comicLibraryModal"))return;
  document.body.insertAdjacentHTML("beforeend",
    '<div id="comicLibraryModal" class="comic-library-modal" role="dialog" aria-modal="true" aria-labelledby="comicLibraryTitle" aria-hidden="true">'+
      '<div class="comic-library-card">'+
        '<header><div><span>UNIVERSO OBLÍVIO · ARQUIVO</span><h3 id="comicLibraryTitle">Biblioteca de Quadrinhos</h3></div><button id="comicLibraryClose" type="button" aria-label="Fechar biblioteca">✕</button></header>'+
        '<div class="comic-library-tools">'+
          '<input id="comicLibrarySearch" type="search" placeholder="Buscar título, arco ou coleção…" aria-label="Buscar quadrinhos">'+
          '<select id="comicLibraryCollection" aria-label="Filtrar por coleção"><option value="">Todas as coleções</option></select>'+
          '<select id="comicLibrarySort" aria-label="Ordenar biblioteca">'+
            '<option value="editorial">Ordem editorial</option>'+
            '<option value="title">Título A–Z</option>'+
            '<option value="recent">Mais recentes</option>'+
          '</select>'+
        '</div>'+
        '<div id="comicLibraryGrid" class="comic-library-grid"></div>'+
      '</div>'+
    '</div>'
  );
  var modal=el("comicLibraryModal");
  el("comicLibraryClose").addEventListener("click",closeLibrary);
  modal.addEventListener("click",function(event){if(event.target===event.currentTarget)closeLibrary();});
  modal.addEventListener("keydown",function(event){
    if(event.key==="Escape"){event.preventDefault();closeLibrary();return;}
    trapFocus(event,modal);
  });
  ["comicLibrarySearch","comicLibraryCollection","comicLibrarySort"].forEach(function(id){
    var node=el(id);if(node)node.addEventListener(id==="comicLibrarySearch"?"input":"change",renderLibrary);
  });
}
function renderLibrary(){
  ensureLibrary();
  var grid=el("comicLibraryGrid"),progress=progressMap();
  var search=String(el("comicLibrarySearch")&&el("comicLibrarySearch").value||"").trim().toLowerCase();
  var collection=String(el("comicLibraryCollection")&&el("comicLibraryCollection").value||"");
  var sort=String(el("comicLibrarySort")&&el("comicLibrarySort").value||"editorial");
  var collectionSelect=el("comicLibraryCollection");
  if(!grid)return;

  var cols=collections();
  if(collectionSelect){
    var previous=collectionSelect.value;
    collectionSelect.innerHTML='<option value="">Todas as coleções</option>'+cols.map(function(name){
      return '<option value="'+esc(name)+'">'+esc(name)+'</option>';
    }).join("");
    if(cols.indexOf(previous)!==-1)collectionSelect.value=previous;
    collection=collectionSelect.value;
  }

  var rows=editions.filter(function(row){
    if(collection&&String(row.collection||"Terra Omega")!==collection)return false;
    if(!search)return true;
    var hay=[row.title,row.subtitle,row.arc,row.collection,row.description].join(" ").toLowerCase();
    return hay.indexOf(search)!==-1;
  }).slice();

  if(sort==="title")rows.sort(function(a,b){return String(a.title||"").localeCompare(String(b.title||""),"pt-BR");});
  if(sort==="recent")rows.sort(function(a,b){
    return String(b.publicationDate||"").localeCompare(String(a.publicationDate||"")) ||
      (Number(b.issueNumber)||0)-(Number(a.issueNumber)||0);
  });

  if(!rows.length){
    grid.innerHTML='<div class="comic-library-empty">Nenhuma edição corresponde aos filtros.</div>';
    return;
  }

  grid.innerHTML=rows.map(function(row){
    var cover=editionCover(row),p=progress[row.id]||{},count=(row.pages||[]).length;
    var current=count?clamp((Number(p.page)||0)+1,1,count):0;
    var pct=count?Math.round((current/count)*100):0;
    var status=p.updatedAt
      ? (p.finished?'Concluído · 100%':('Continuar na pág. '+current+' · '+pct+'%'))
      : 'Começar leitura';
    var dates=[];
    if(row.storyDate)dates.push(esc(row.storyDate));
    else if(row.publicationDate)dates.push(esc(row.publicationDate));
    return '<button type="button" class="comic-library-item" data-library-edition="'+esc(row.id)+'">'+
      '<span class="comic-library-cover">'+(cover?'<img src="'+esc(cover)+'" alt="" loading="lazy">':'<i>SEM CAPA</i>')+'</span>'+
      '<span class="comic-library-copy">'+
        '<small>'+esc(row.collection||"Terra Omega")+(row.arc?' · '+esc(row.arc):'')+'</small>'+
        '<strong>'+esc(editionLabel(row))+'</strong>'+
        '<em>'+count+' página'+(count===1?'':'s')+(dates.length?' · '+dates.join(''):'')+'</em>'+
        '<em class="comic-library-resume">'+status+'</em>'+
      '</span>'+
    '</button>';
  }).join("");

  grid.querySelectorAll("[data-library-edition]").forEach(function(button){
    button.addEventListener("click",function(){
      chooseEditionById(button.getAttribute("data-library-edition"),true,{replace:false});
      closeLibrary();
    });
  });
}
function openLibrary(){
  ensureLibrary();renderLibrary();
  libraryReturnFocus=document.activeElement;
  var modal=el("comicLibraryModal");
  if(modal){modal.classList.add("show");modal.setAttribute("aria-hidden","false");}
  setTimeout(function(){var search=el("comicLibrarySearch");if(search)search.focus();},0);
}
function closeLibrary(){
  var modal=el("comicLibraryModal");
  if(modal){modal.classList.remove("show");modal.setAttribute("aria-hidden","true");}
  if(libraryReturnFocus&&libraryReturnFocus.focus)try{libraryReturnFocus.focus();}catch(error){}
  libraryReturnFocus=null;
}

function ensureHelp(){
  if(el("comicHelpModal"))return;
  document.body.insertAdjacentHTML("beforeend",
    '<div id="comicHelpModal" class="comic-help-modal" role="dialog" aria-modal="true" aria-labelledby="comicHelpTitle" aria-hidden="true">'+
      '<div class="comic-help-card">'+
        '<header><h3 id="comicHelpTitle">Atalhos e gestos</h3><button id="comicHelpClose" type="button" aria-label="Fechar ajuda">✕</button></header>'+
        '<div class="comic-help-grid">'+
          '<kbd>← / →</kbd><span>Página anterior / próxima</span>'+
          '<kbd>Home / End</kbd><span>Primeira / última página</span>'+
          '<kbd>+ / −</kbd><span>Aumentar / diminuir zoom</span>'+
          '<kbd>F</kbd><span>Ajustar à tela</span>'+
          '<kbd>W</kbd><span>Ajustar à largura</span>'+
          '<kbd>1</kbd><span>Tamanho natural 1:1</span>'+
          '<kbd>R</kbd><span>Ativar / sair do Modo leitura</span>'+
          '<kbd>2 cliques</kbd><span>Focar uma página individual</span>'+
          '<kbd>Ctrl + roda</kbd><span>Zoom com o mouse</span>'+
          '<kbd>Swipe</kbd><span>Avançar / voltar no celular</span>'+
          '<kbd>Pinça</kbd><span>Zoom em telas touch</span>'+
        '</div>'+
      '</div>'+
    '</div>'
  );
  var modal=el("comicHelpModal");
  el("comicHelpClose").addEventListener("click",closeHelp);
  modal.addEventListener("click",function(event){if(event.target===event.currentTarget)closeHelp();});
  modal.addEventListener("keydown",function(event){
    if(event.key==="Escape"){event.preventDefault();closeHelp();return;}
    trapFocus(event,modal);
  });
}
function openHelp(){
  ensureHelp();helpReturnFocus=document.activeElement;
  var modal=el("comicHelpModal");modal.classList.add("show");modal.setAttribute("aria-hidden","false");
  setTimeout(function(){el("comicHelpClose").focus();},0);
}
function closeHelp(){
  var modal=el("comicHelpModal");
  if(modal){modal.classList.remove("show");modal.setAttribute("aria-hidden","true");}
  if(helpReturnFocus&&helpReturnFocus.focus)try{helpReturnFocus.focus();}catch(error){}
  helpReturnFocus=null;
}
function copyComicLink(){
  var router=window.TerraOmegaApp&&window.TerraOmegaApp.router;
  if(router&&router.copyRoute)router.copyRoute(currentComicRoute(),"quadrinho");
}

function showChrome(){
  var reader=el("comicReader");if(!reader||!readingMode)return;
  reader.classList.remove("comic-ui-hidden");
  clearTimeout(chromeTimer);
  chromeTimer=setTimeout(function(){if(readingMode)reader.classList.add("comic-ui-hidden");},1800);
}
function setReadingMode(value){
  readingMode=!!value;
  var reader=el("comicReader"),button=el("comicReadingModeBtn");
  if(!reader)return;
  reader.classList.toggle("comic-reading-mode",readingMode);
  document.body.classList.toggle("comic-reading-active",readingMode);
  if(button)button.classList.toggle("active",readingMode);
  if(readingMode){showChrome();reader.focus&&reader.focus();}
  else{clearTimeout(chromeTimer);reader.classList.remove("comic-ui-hidden");}
}
function toggleFullscreen(){
  var reader=el("comicReader");if(!reader)return;
  if(document.fullscreenElement){if(document.exitFullscreen)document.exitFullscreen();}
  else if(reader.requestFullscreen)reader.requestFullscreen().catch(function(){});
  else if(reader.webkitRequestFullscreen)reader.webkitRequestFullscreen();
}

function bindPanZoom(){
  var stage=el("comicReaderStage");if(!stage)return;
  stage.addEventListener("wheel",function(event){
    if(!(event.ctrlKey||event.metaKey))return;
    event.preventDefault();zoom(event.deltaY<0?.1:-.1);
  },{passive:false});

  stage.addEventListener("pointerdown",function(event){
    if(event.pointerType==="touch"||event.button!==0)return;
    if(!(fitMode==="custom"||effectiveFit()==="actual"))return;
    if(!event.target.closest(".comic-page-image"))return;
    dragState={x:event.clientX,y:event.clientY,left:stage.scrollLeft,top:stage.scrollTop,moved:false};
    stage.classList.add("is-panning");stage.setPointerCapture&&stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove",function(event){
    if(!dragState)return;
    var dx=event.clientX-dragState.x,dy=event.clientY-dragState.y;
    if(Math.abs(dx)+Math.abs(dy)>4)dragState.moved=true;
    stage.scrollLeft=dragState.left-dx;stage.scrollTop=dragState.top-dy;
  });
  function stopPan(){dragState=null;stage.classList.remove("is-panning");}
  stage.addEventListener("pointerup",stopPan);stage.addEventListener("pointercancel",stopPan);

  stage.addEventListener("touchstart",function(event){
    if(event.touches.length===2){
      var a=event.touches[0],b=event.touches[1];
      pinchState={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),zoom:fitMode==="custom"?customZoom:1};
      touchState=null;event.preventDefault();
    }else if(event.touches.length===1){
      touchState={x:event.touches[0].clientX,y:event.touches[0].clientY,time:Date.now()};
      pinchState=null;
    }
  },{passive:false});
  stage.addEventListener("touchmove",function(event){
    if(pinchState&&event.touches.length===2){
      var a=event.touches[0],b=event.touches[1];
      var distance=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      fitMode="custom";customZoom=clamp(pinchState.zoom*(distance/pinchState.distance),.5,3);
      applySizing();event.preventDefault();
    }
  },{passive:false});
  stage.addEventListener("touchend",function(event){
    if(pinchState){
      saveValue(FIT_KEY,fitMode);saveValue(ZOOM_KEY,customZoom);pinchState=null;return;
    }
    if(!touchState||viewMode==="continuous")return;
    var changed=event.changedTouches&&event.changedTouches[0];if(!changed)return;
    var dx=changed.clientX-touchState.x,dy=changed.clientY-touchState.y;
    if(Date.now()-touchState.time<600&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25)move(dx<0?1:-1);
    touchState=null;
  });
}

function bind(){
  if(mounted)return;
  mounted=true;hydratePreferences();ensureLibrary();

  var collectionSelect=el("comicCollectionSelect"),editionSelect=el("comicEditionSelect");
  if(collectionSelect)collectionSelect.addEventListener("change",function(){
    activeCollection=collectionSelect.value;
    var idx=editions.findIndex(function(row){return String(row.collection||"Terra Omega")===activeCollection;});
    chooseEdition(idx>=0?idx:0,true,{replace:false});
  });
  if(editionSelect)editionSelect.addEventListener("change",function(){chooseEdition(Number(editionSelect.value)||0,true,{replace:false});});

  [["comicPrevBtn",-1],["comicStagePrevBtn",-1],["comicNextBtn",1],["comicStageNextBtn",1]].forEach(function(pair){
    var b=el(pair[0]);if(b)b.addEventListener("click",function(){move(pair[1]);});
  });
  var first=el("comicFirstBtn"),last=el("comicLastBtn");
  if(first)first.addEventListener("click",function(){goTo(0,true);});
  if(last)last.addEventListener("click",function(){goTo(Math.max(0,pages().length-1),true);});
  var jump=el("comicPageJump");
  if(jump){
    var jumpNow=function(){var value=Number(jump.value);if(Number.isFinite(value))goTo(value-1,true);};
    jump.addEventListener("change",jumpNow);jump.addEventListener("keydown",function(event){if(event.key==="Enter"){event.preventDefault();jumpNow();}});
  }

  document.querySelectorAll("[data-comic-view]").forEach(function(button){
    button.addEventListener("click",function(){setView(button.getAttribute("data-comic-view"));});
  });
  var fitSelect=el("comicFitSelect");if(fitSelect)fitSelect.addEventListener("change",function(){setFit(fitSelect.value);});
  var zoomIn=el("comicZoomInBtn"),zoomOut=el("comicZoomOutBtn");
  if(zoomIn)zoomIn.addEventListener("click",function(){zoom(.1);});
  if(zoomOut)zoomOut.addEventListener("click",function(){zoom(-.1);});
  var thumbToggle=el("comicThumbToggleBtn");
  if(thumbToggle)thumbToggle.addEventListener("click",function(){thumbsVisible=!thumbsVisible;saveValue(THUMBS_KEY,thumbsVisible?"1":"0");updateThumbs();});
  var pageTurnToggle=el("comicPageTurnToggleBtn");
  if(pageTurnToggle)pageTurnToggle.addEventListener("click",function(){
    setPageTurnEnabled(!pageTurnEnabled);
    var menu=el("comicMoreMenu");if(menu)menu.open=false;
  });
  updatePageTurnToggle();
  if(window.matchMedia){
    var motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(motionQuery.addEventListener)motionQuery.addEventListener("change",updatePageTurnToggle);
  }
  var fullscreen=el("comicFullscreenBtn");if(fullscreen)fullscreen.addEventListener("click",function(){toggleFullscreen();var menu=el("comicMoreMenu");if(menu)menu.open=false;});
  var copyLink=el("comicCopyLinkBtn");if(copyLink)copyLink.addEventListener("click",function(){copyComicLink();var menu=el("comicMoreMenu");if(menu)menu.open=false;});
  var help=el("comicHelpBtn");if(help)help.addEventListener("click",function(){var menu=el("comicMoreMenu");if(menu)menu.open=false;openHelp();});
  var library=el("comicLibraryBtn");if(library)library.addEventListener("click",openLibrary);
  var reading=el("comicReadingModeBtn");if(reading)reading.addEventListener("click",function(){setReadingMode(!readingMode);});
  var focusExit=el("comicFocusExitBtn");if(focusExit)focusExit.addEventListener("click",function(){if(focusReturn){cancelFocus();render();}});

  var reader=el("comicReader");
  if(reader){
    ["mousemove","pointerdown","touchstart"].forEach(function(type){reader.addEventListener(type,showChrome,{passive:true});});
  }
  bindPanZoom();

  document.addEventListener("keydown",function(event){
    if(!active()&&!readingMode)return;
    var target=event.target;
    if(target&&/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
    if(event.key==="Escape"){
      if(el("comicLibraryModal")&&el("comicLibraryModal").classList.contains("show")){closeLibrary();return;}
      if(focusReturn){cancelFocus();render();return;}
      if(readingMode){setReadingMode(false);return;}
    }
    if(event.key==="ArrowLeft"){event.preventDefault();move(-1);}
    if(event.key==="ArrowRight"){event.preventDefault();move(1);}
    if(event.key==="Home"){event.preventDefault();goTo(0,true);}
    if(event.key==="End"){event.preventDefault();goTo(Math.max(0,pages().length-1),true);}
    if(event.key==="+"||event.key==="="){event.preventDefault();zoom(.1);}
    if(event.key==="-"){event.preventDefault();zoom(-.1);}
    if(event.key.toLowerCase()==="f"){event.preventDefault();setFit("screen");}
    if(event.key.toLowerCase()==="w"){event.preventDefault();setFit("width");}
    if(event.key==="1"){event.preventDefault();setFit("actual");}
    if(event.key.toLowerCase()==="r"){event.preventDefault();setReadingMode(!readingMode);}
  });
  document.addEventListener("fullscreenchange",function(){
    var button=el("comicFullscreenBtn");if(button)button.classList.toggle("active",!!document.fullscreenElement);
  });
}

async function load(){
  if(catalog)return catalog;
  if(loadingPromise)return loadingPromise;
  loadingPromise=fetch("data/comics.json?bust="+Date.now(),{cache:"no-store"})
    .then(function(response){if(!response.ok)throw new Error("Catálogo de quadrinhos indisponível.");return response.json();})
    .then(function(data){
      assetRevision=Date.now();
      preloadedPageImages.clear();
      catalog=data&&typeof data==="object"?data:{series:[]};
      editions=publishedEditions(catalog);
      var lastId=loadValue(LAST_EDITION_KEY,"");
      var found=editions.findIndex(function(row){return row&&row.id===lastId;});
      seriesIndex=found>=0?found:0;
      var edition=currentSeries();activeCollection=edition?String(edition.collection||"Terra Omega"):"";
      restoreProgressForCurrent();
      return catalog;
    })
    .catch(function(error){
      console.error("Terra Omega Comics:",error);catalog={series:[]};editions=[];return catalog;
    })
    .finally(function(){loadingPromise=null;});
  return loadingPromise;
}

async function mount(){bind();await load();render();}
async function reload(options){
  var currentId=currentSeries()&&currentSeries().id;
  catalog=null;editions=[];loadingPromise=null;
  await load();
  var targetId=options&&options.editionId?options.editionId:currentId;
  if(targetId)chooseEditionById(targetId,true,{silentRoute:true});else render();
}

window.TerraOmegaApp.comicReader={
  mount:mount,reload:reload,next:function(){move(1);},previous:function(){move(-1);},
  goTo:goTo,setView:setView,setFit:setFit,setPageTurnEnabled:setPageTurnEnabled,
  ready:load,openLibrary:openLibrary,openRoute:openRoute,currentRoute:currentComicRoute,
  getState:function(){return {viewMode:viewMode,fitMode:fitMode,pageIndex:pageIndex,edition:currentSeries(),readingMode:readingMode};}
};

if(active())mount();

})();