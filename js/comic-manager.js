(function(){
"use strict";

window.TerraOmegaApp=window.TerraOmegaApp||{};
var core=window.TerraOmegaCore;
if(!core)throw new Error("Terra Omega: núcleo não carregado antes de js/comic-manager.js");

var showToast=core.showToast;
var showConfirm=core.showConfirm;
var escapeHtml=core.escapeHtml;
var catalog={version:2,series:[]};
var selectedId="";
var newDraft=false;
var busy=false;
var pendingReplaceSrc="";

function el(id){return document.getElementById(id);}
function backend(){return window.TerraOmegaApp&&window.TerraOmegaApp.backend;}
function selected(){return (catalog.series||[]).find(function(row){return row&&row.id===selectedId;})||null;}
function escapeAttr(value){return String(value||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

function ensureModal(){
  if(el("comicManagerModal"))return;
  document.body.insertAdjacentHTML("beforeend",`
<div id="comicManagerModal" class="comic-manager-modal" role="dialog" aria-modal="true" aria-labelledby="comicManagerTitle">
  <div class="comic-manager-card">
    <header class="comic-manager-head">
      <div>
        <div class="comic-manager-eyebrow">UNIVERSO OBLÍVIO · PUBLICAÇÃO SEQUENCIAL</div>
        <h3 id="comicManagerTitle">📖 Editor de Quadrinhos</h3>
      </div>
      <button id="comicManagerClose" type="button" aria-label="Fechar">✕</button>
    </header>

    <div class="comic-manager-body">
      <aside class="comic-manager-library">
        <div class="comic-manager-library-head">
          <div><strong>Edições</strong><span id="comicManagerCount">0</span></div>
          <button id="comicManagerNew" type="button">＋ Nova edição</button>
        </div>
        <div id="comicManagerList" class="comic-manager-list"></div>
      </aside>

      <main class="comic-manager-editor">
        <div id="comicManagerBlank" class="comic-manager-blank">
          <span>📚</span><strong>Selecione uma edição</strong>
          <small>Ou crie uma nova para começar.</small>
        </div>

        <div id="comicManagerFormWrap" hidden>
          <div class="comic-manager-form-grid">
            <label>Coleção<input id="comicManagerCollection" type="text" maxlength="120" placeholder="Ex.: Tristan Queen"></label>
            <label>Título<input id="comicManagerEditionTitle" type="text" maxlength="160" placeholder="Título da edição"></label>
            <label>Arco<input id="comicManagerArc" type="text" maxlength="120" placeholder="Ex.: Tristan & Misty"></label>
            <label>Nº da edição<input id="comicManagerIssueNumber" type="number" min="0" max="9999" step="1" placeholder="1"></label>
            <label>Subtítulo<input id="comicManagerSubtitle" type="text" maxlength="160" placeholder="Opcional"></label>
            <label>Status
              <select id="comicManagerStatus">
                <option value="published">Publicado</option>
                <option value="draft">Rascunho</option>
              </select>
            </label>
            <label class="wide">Descrição<textarea id="comicManagerDescription" rows="3" maxlength="800" placeholder="Resumo da edição"></textarea></label>
          </div>

          <section class="comic-manager-cover">
            <div class="comic-manager-cover-preview" id="comicManagerCoverPreview">
              <span>SEM CAPA</span>
            </div>
            <div class="comic-manager-cover-copy">
              <strong>Capa da edição</strong>
              <small>Usada na Biblioteca. Se não houver capa própria, o leitor usa a primeira página como fallback.</small>
              <div>
                <button id="comicManagerUploadCover" type="button">🖼 Enviar capa</button>
                <button id="comicManagerRemoveCover" type="button">Remover capa</button>
              </div>
            </div>
            <input id="comicManagerCoverInput" type="file" accept="image/png,image/jpeg,image/webp" hidden>
          </section>

          <div class="comic-manager-edition-actions">
            <button id="comicManagerSaveEdition" class="primary" type="button">💾 Salvar edição</button>
            <button id="comicManagerOpenReader" type="button">👁 Abrir no leitor</button>
            <button id="comicManagerDeleteEdition" class="danger" type="button">🗑 Excluir edição</button>
          </div>

          <section class="comic-manager-pages">
            <div class="comic-manager-pages-head">
              <div><strong>Páginas</strong><span id="comicManagerPageCount">0 páginas</span></div>
              <div>
                <button id="comicManagerAddPages" type="button">＋ Adicionar páginas</button>
                <button id="comicManagerGenerateThumbs" type="button">▦ Otimizar miniaturas</button>
                <button id="comicManagerSavePages" type="button">💾 Salvar ordem e textos</button>
              </div>
            </div>
            <div id="comicManagerUploadStatus" class="comic-manager-upload-status" data-state="idle"></div>
            <input id="comicManagerFileInput" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden>
            <div id="comicManagerPagesList" class="comic-manager-pages-list"></div>
          </section>
        </div>
      </main>
    </div>
  </div>
</div>`);

  el("comicManagerClose").addEventListener("click",close);
  el("comicManagerModal").addEventListener("click",function(event){if(event.target===event.currentTarget)close();});
  el("comicManagerNew").addEventListener("click",startNew);
  el("comicManagerSaveEdition").addEventListener("click",saveEdition);
  el("comicManagerDeleteEdition").addEventListener("click",deleteEdition);
  el("comicManagerOpenReader").addEventListener("click",openReader);
  el("comicManagerUploadCover").addEventListener("click",function(){
    if(!selectedId){showToast("Salve a edição antes de enviar uma capa.","warning",4000);return;}
    var input=el("comicManagerCoverInput");input.value="";input.click();
  });
  el("comicManagerRemoveCover").addEventListener("click",removeCover);
  el("comicManagerCoverInput").addEventListener("change",function(){
    var file=this.files&&this.files[0];if(file)uploadCover(file);
  });
  el("comicManagerGenerateThumbs").addEventListener("click",generateMissingThumbnails);
  el("comicManagerAddPages").addEventListener("click",function(){
    if(!selectedId){showToast("Salve a edição antes de adicionar páginas.","warning",4000);return;}
    pendingReplaceSrc="";
    var input=el("comicManagerFileInput");input.multiple=true;input.value="";input.click();
  });
  el("comicManagerFileInput").addEventListener("change",function(){
    var files=Array.from(this.files||[]);
    if(files.length)uploadFiles(files,pendingReplaceSrc);
  });
  el("comicManagerSavePages").addEventListener("click",savePages);

  document.addEventListener("keydown",function(event){
    var modal=el("comicManagerModal");
    if(!modal||!modal.classList.contains("show"))return;
    if(event.key==="Escape")close();
  });
}

function setBusy(value,message){
  busy=!!value;
  var modal=el("comicManagerModal");
  if(modal)modal.classList.toggle("is-busy",busy);
  var status=el("comicManagerUploadStatus");
  if(status&&message){status.textContent=message;status.setAttribute("data-state",busy?"working":"idle");}
  ["comicManagerSaveEdition","comicManagerDeleteEdition","comicManagerAddPages","comicManagerSavePages","comicManagerUploadCover","comicManagerRemoveCover","comicManagerGenerateThumbs"].forEach(function(id){
    var button=el(id);if(button)button.disabled=busy;
  });
}

async function load(){
  var response=await fetch("data/comics.json?bust="+Date.now(),{cache:"no-store"});
  if(!response.ok)throw new Error("Não foi possível carregar o catálogo de quadrinhos.");
  var data=await response.json();
  catalog=data&&typeof data==="object"?data:{version:3,series:[]};
  if(!Array.isArray(catalog.series))catalog.series=[];
  return catalog;
}

function renderList(){
  var root=el("comicManagerList");
  var count=el("comicManagerCount");
  var rows=catalog.series||[];
  if(count)count.textContent=String(rows.length);
  if(!root)return;

  root.innerHTML=rows.length?rows.map(function(row,index){
    var pages=Array.isArray(row.pages)?row.pages.length:0;
    return '<article class="comic-manager-edition-card'+(row.id===selectedId?' active':'')+'" data-comic-edition="'+escapeAttr(row.id)+'">'+
      '<button type="button" class="comic-manager-edition-main" data-comic-select="'+escapeAttr(row.id)+'">'+
        '<span>'+(row.status==="draft"?"RASCUNHO":"PUBLICADO")+'</span>'+
        '<strong>'+escapeHtml(row.title||"Sem título")+'</strong>'+
        '<small>'+escapeHtml(row.collection||"Terra Omega")+' · '+pages+' pág.'+(pages===1?"":"s")+'</small>'+
      '</button>'+
      '<div class="comic-manager-order-actions">'+
        '<button type="button" data-comic-order="'+index+'" data-direction="-1" '+(index===0?"disabled":"")+' title="Mover para cima">↑</button>'+
        '<button type="button" data-comic-order="'+index+'" data-direction="1" '+(index===rows.length-1?"disabled":"")+' title="Mover para baixo">↓</button>'+
      '</div>'+
    '</article>';
  }).join(""):'<div class="comic-manager-empty">Nenhuma edição cadastrada.</div>';

  root.querySelectorAll("[data-comic-select]").forEach(function(button){
    button.addEventListener("click",function(){
      selectedId=button.getAttribute("data-comic-select")||"";newDraft=false;render();
    });
  });
  root.querySelectorAll("[data-comic-order]").forEach(function(button){
    button.addEventListener("click",function(){
      reorderEdition(Number(button.getAttribute("data-comic-order")),Number(button.getAttribute("data-direction")));
    });
  });
}

function renderForm(){
  var blank=el("comicManagerBlank");
  var wrap=el("comicManagerFormWrap");
  var row=selected();

  if(!row&&!newDraft){
    if(blank)blank.hidden=false;if(wrap)wrap.hidden=true;return;
  }
  if(blank)blank.hidden=true;if(wrap)wrap.hidden=false;

  row=row||{id:"",title:"",subtitle:"",collection:"",arc:"",issueNumber:0,description:"",status:"draft",pages:[]};
  el("comicManagerCollection").value=row.collection||"";
  el("comicManagerEditionTitle").value=row.title||"";
  el("comicManagerArc").value=row.arc||"";
  el("comicManagerIssueNumber").value=row.issueNumber||"";
  el("comicManagerSubtitle").value=row.subtitle||"";
  el("comicManagerDescription").value=row.description||"";
  el("comicManagerStatus").value=row.status==="draft"?"draft":"published";
  renderCover(row);

  var deleteBtn=el("comicManagerDeleteEdition");
  var readerBtn=el("comicManagerOpenReader");
  if(deleteBtn)deleteBtn.disabled=!selectedId||busy;
  if(readerBtn)readerBtn.disabled=!selectedId||row.status==="draft";

  renderPages();
}

function renderPages(){
  var root=el("comicManagerPagesList");
  var count=el("comicManagerPageCount");
  var row=selected();
  var pages=row&&Array.isArray(row.pages)?row.pages:[];
  if(count)count.textContent=pages.length+" página"+(pages.length===1?"":"s");
  if(!root)return;

  if(!selectedId){
    root.innerHTML='<div class="comic-manager-empty">Salve a edição para liberar o upload de páginas.</div>';
    return;
  }

  root.innerHTML=pages.length?pages.map(function(page,index){
    return '<article class="comic-manager-page-row" draggable="true" data-comic-page-row="'+escapeAttr(page.src)+'">'+
      '<div class="comic-manager-page-drag" title="Arraste para reordenar">⋮⋮</div>'+
      '<img src="'+escapeAttr(page.thumb||page.src)+'" alt="" loading="lazy" decoding="async">'+
      '<div class="comic-manager-page-fields">'+
        '<strong>Página '+(index+1)+'</strong>'+
        '<input data-page-label type="text" maxlength="120" value="'+escapeAttr(page.label||("Página "+(index+1)))+'" placeholder="Rótulo">'+
        '<input data-page-alt type="text" maxlength="240" value="'+escapeAttr(page.alt||"")+'" placeholder="Descrição acessível / alt">'+
      '</div>'+
      '<div class="comic-manager-page-actions">'+
        '<button type="button" data-page-up '+(index===0?"disabled":"")+' title="Mover para cima">↑</button>'+
        '<button type="button" data-page-down '+(index===pages.length-1?"disabled":"")+' title="Mover para baixo">↓</button>'+
        '<button type="button" data-page-replace title="Substituir imagem">↻</button>'+
        '<button type="button" data-page-delete class="danger" title="Excluir página">🗑</button>'+
      '</div>'+
    '</article>';
  }).join(""):'<div class="comic-manager-empty">Nenhuma página ainda. Use “Adicionar páginas”.</div>';

  bindPageRows();
}

function bindPageRows(){
  var root=el("comicManagerPagesList");if(!root)return;
  var dragging=null;

  root.querySelectorAll(".comic-manager-page-row").forEach(function(row){
    row.addEventListener("dragstart",function(){dragging=row;row.classList.add("dragging");});
    row.addEventListener("dragend",function(){row.classList.remove("dragging");dragging=null;});
    row.addEventListener("dragover",function(event){
      event.preventDefault();
      if(!dragging||dragging===row)return;
      var rect=row.getBoundingClientRect();
      var before=event.clientY<rect.top+rect.height/2;
      root.insertBefore(dragging,before?row:row.nextSibling);
      refreshPageRowNumbers();
    });

    var up=row.querySelector("[data-page-up]");
    var down=row.querySelector("[data-page-down]");
    var replace=row.querySelector("[data-page-replace]");
    var del=row.querySelector("[data-page-delete]");
    if(up)up.addEventListener("click",function(){var prev=row.previousElementSibling;if(prev){root.insertBefore(row,prev);refreshPageRowNumbers();}});
    if(down)down.addEventListener("click",function(){var next=row.nextElementSibling;if(next){root.insertBefore(next,row);refreshPageRowNumbers();}});
    if(replace)replace.addEventListener("click",function(){
      pendingReplaceSrc=row.getAttribute("data-comic-page-row")||"";
      var input=el("comicManagerFileInput");input.multiple=false;input.value="";input.click();
    });
    if(del)del.addEventListener("click",function(){deletePage(row.getAttribute("data-comic-page-row")||"");});
  });
}

function refreshPageRowNumbers(){
  var rows=Array.from(document.querySelectorAll("#comicManagerPagesList .comic-manager-page-row"));
  rows.forEach(function(row,index){
    var title=row.querySelector(".comic-manager-page-fields strong");if(title)title.textContent="Página "+(index+1);
    var up=row.querySelector("[data-page-up]"),down=row.querySelector("[data-page-down]");
    if(up)up.disabled=index===0;if(down)down.disabled=index===rows.length-1;
  });
}

function render(){renderList();renderForm();}

function startNew(){
  selectedId="";newDraft=true;render();
  setTimeout(function(){var input=el("comicManagerEditionTitle");if(input)input.focus();},0);
}

async function request(body){
  var b=backend();
  if(!b||!b.isAuthenticated||!b.isAuthenticated())throw new Error("Entre como editor para continuar.");
  return b.request("/api/media",{method:"POST",body:body});
}

async function saveEdition(){
  var title=el("comicManagerEditionTitle").value.trim();
  if(!title){showToast("Informe o título da edição.","warning",3500);el("comicManagerEditionTitle").focus();return;}
  setBusy(true,"Salvando edição…");
  try{
    var result=await request({
      action:"comic-save",
      id:selectedId,
      collection:el("comicManagerCollection").value.trim(),
      title:title,
      arc:el("comicManagerArc").value.trim(),
      issueNumber:Number(el("comicManagerIssueNumber").value)||0,
      subtitle:el("comicManagerSubtitle").value.trim(),
      description:el("comicManagerDescription").value.trim(),
      status:el("comicManagerStatus").value
    });
    catalog=result.catalog||catalog;
    selectedId=result.edition&&result.edition.id?result.edition.id:selectedId;
    newDraft=false;
    render();
    notifyReader(selectedId);
    showToast("Edição salva no GitHub.","success",3500);
  }catch(error){
    console.error("Terra Omega comic manager:",error);
    showToast(error.message||"Falha ao salvar a edição.","error",5500);
  }finally{setBusy(false,"");}
}

function deleteEdition(){
  var row=selected();if(!row)return;
  showConfirm("Excluir edição","Excluir “"+row.title+"” e todas as páginas armazenadas no projeto? Esta ação será registrada em commit.",async function(){
    setBusy(true,"Excluindo edição…");
    try{
      var result=await request({action:"comic-delete",id:row.id});
      catalog=result.catalog||catalog;selectedId="";newDraft=false;render();notifyReader();
      showToast("Edição excluída.","success",3500);
    }catch(error){console.error(error);showToast(error.message||"Falha ao excluir a edição.","error",5500);}
    finally{setBusy(false,"");}
  });
}

async function reorderEdition(index,direction){
  var rows=(catalog.series||[]).slice();
  var target=index+direction;if(target<0||target>=rows.length)return;
  var moved=rows.splice(index,1)[0];rows.splice(target,0,moved);
  setBusy(true,"Salvando ordem das edições…");
  try{
    var result=await request({action:"comic-editions-reorder",ids:rows.map(function(row){return row.id;})});
    catalog=result.catalog||catalog;renderList();notifyReader(selectedId);
  }catch(error){showToast(error.message||"Falha ao reorganizar edições.","error",5000);}
  finally{setBusy(false,"");}
}

function readAsDataUrl(blob){
  return new Promise(function(resolve,reject){
    var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=reject;reader.readAsDataURL(blob);
  });
}

async function bitmapFromFile(file){
  if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type))throw new Error("Use PNG, JPEG ou WebP.");
  return createImageBitmap(file);
}

function canvasFromBitmap(bitmap,maxWidth,maxHeight){
  var scale=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
  var width=Math.max(1,Math.round(bitmap.width*scale));
  var height=Math.max(1,Math.round(bitmap.height*scale));
  var canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  var ctx=canvas.getContext("2d",{alpha:false});ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);ctx.drawImage(bitmap,0,0,width,height);
  return canvas;
}

function encodeWebp(canvas,quality){
  return new Promise(function(resolve){canvas.toBlob(resolve,"image/webp",quality);});
}

async function optimizePageImage(file){
  var bitmap=await bitmapFromFile(file);
  var mainCanvas=canvasFromBitmap(bitmap,1800,2600);
  var thumbCanvas=canvasFromBitmap(bitmap,260,390);
  if(bitmap.close)bitmap.close();

  var mainBlob=await encodeWebp(mainCanvas,.9);
  if(mainBlob&&mainBlob.size>1900000)mainBlob=await encodeWebp(mainCanvas,.78);
  if(mainBlob&&mainBlob.size>1900000){
    var ratio=Math.sqrt(1800000/mainBlob.size);
    var smaller=document.createElement("canvas");
    smaller.width=Math.max(1,Math.round(mainCanvas.width*ratio));
    smaller.height=Math.max(1,Math.round(mainCanvas.height*ratio));
    smaller.getContext("2d",{alpha:false}).drawImage(mainCanvas,0,0,smaller.width,smaller.height);
    mainCanvas=smaller;mainBlob=await encodeWebp(mainCanvas,.82);
  }
  var thumbBlob=await encodeWebp(thumbCanvas,.72);
  if(!mainBlob||!thumbBlob)throw new Error("O navegador não conseguiu otimizar esta página.");
  if(mainBlob.size>2000000)throw new Error("Esta página ainda ficou acima de 2 MB após a otimização.");

  return {
    mimeType:"image/webp",
    contentBase64:await readAsDataUrl(mainBlob),
    thumbnailMimeType:"image/webp",
    thumbnailBase64:await readAsDataUrl(thumbBlob)
  };
}

async function thumbnailFromBlob(blob){
  var bitmap=await createImageBitmap(blob);
  var canvas=canvasFromBitmap(bitmap,260,390);if(bitmap.close)bitmap.close();
  var thumb=await encodeWebp(canvas,.72);
  if(!thumb)throw new Error("Falha ao gerar miniatura.");
  return readAsDataUrl(thumb);
}

async function optimizeCoverImage(file){
  var bitmap=await bitmapFromFile(file);
  var canvas=canvasFromBitmap(bitmap,1000,1500);if(bitmap.close)bitmap.close();
  var blob=await encodeWebp(canvas,.86);
  if(blob&&blob.size>1900000)blob=await encodeWebp(canvas,.74);
  if(!blob||blob.size>2000000)throw new Error("A capa ficou grande demais após a otimização.");
  return {mimeType:"image/webp",contentBase64:await readAsDataUrl(blob)};
}

function renderCover(row){
  var preview=el("comicManagerCoverPreview");
  var remove=el("comicManagerRemoveCover");
  if(!preview)return;
  var fallback=row&&row.pages&&row.pages[0]?(row.pages[0].thumb||row.pages[0].src):"";
  var src=row&&row.cover?row.cover:fallback;
  preview.innerHTML=src?'<img src="'+escapeAttr(src)+'" alt="" loading="lazy">':'<span>SEM CAPA</span>';
  preview.classList.toggle("is-fallback",!!src&&!(row&&row.cover));
  if(remove)remove.disabled=!selectedId||!row||!row.cover||busy;
}

async function uploadCover(file){
  if(!selectedId)return;
  setBusy(true,"Otimizando capa…");
  try{
    var optimized=await optimizeCoverImage(file);
    var result=await request({action:"comic-cover-upload",id:selectedId,mimeType:optimized.mimeType,contentBase64:optimized.contentBase64});
    catalog=result.catalog||catalog;render();notifyReader(selectedId);
    showToast("Capa atualizada.","success",3500);
  }catch(error){console.error(error);showToast(error.message||"Falha ao atualizar a capa.","error",5500);}
  finally{setBusy(false,"");}
}

function removeCover(){
  var row=selected();if(!row||!row.cover)return;
  showConfirm("Remover capa","Remover a capa própria desta edição? A primeira página voltará a ser usada como fallback.",async function(){
    setBusy(true,"Removendo capa…");
    try{
      var result=await request({action:"comic-cover-delete",id:selectedId});
      catalog=result.catalog||catalog;render();notifyReader(selectedId);showToast("Capa removida.","success",3200);
    }catch(error){showToast(error.message||"Falha ao remover capa.","error",5000);}
    finally{setBusy(false,"");}
  });
}

async function generateMissingThumbnails(){
  var row=selected();
  var missing=row&&Array.isArray(row.pages)?row.pages.filter(function(page){return !page.thumb;}):[];
  if(!missing.length){showToast("Todas as páginas já possuem miniaturas leves.","info",3500);return;}
  setBusy(true,"Gerando miniaturas leves…");
  try{
    for(var i=0;i<missing.length;i++){
      var page=missing[i];
      var status=el("comicManagerUploadStatus");
      if(status){status.textContent="Miniatura "+(i+1)+" de "+missing.length+"…";status.setAttribute("data-state","working");}
      var response=await fetch(page.src,{cache:"no-store"});
      if(!response.ok)throw new Error("Não foi possível carregar "+(page.label||page.src)+".");
      var thumbnailBase64=await thumbnailFromBlob(await response.blob());
      var result=await request({action:"comic-page-thumbnail",id:selectedId,src:page.src,thumbnailBase64:thumbnailBase64});
      catalog=result.catalog||catalog;
    }
    render();notifyReader(selectedId);
    var done=el("comicManagerUploadStatus");if(done){done.textContent="Miniaturas otimizadas.";done.setAttribute("data-state","success");}
    showToast("Miniaturas leves geradas.","success",3500);
  }catch(error){console.error(error);showToast(error.message||"Falha ao gerar miniaturas.","error",5500);}
  finally{setBusy(false,"");}
}

async function uploadFiles(files,replaceSrc){
  if(!selectedId)return;
  setBusy(true,replaceSrc?"Otimizando página substituta…":"Preparando páginas…");
  try{
    var queue=replaceSrc?files.slice(0,1):files;
    for(var i=0;i<queue.length;i++){
      var file=queue[i];
      var optimized=await optimizePageImage(file);
      var current=selected();
      var page=current&&replaceSrc?(current.pages||[]).find(function(row){return row.src===replaceSrc;}):null;
      var status=el("comicManagerUploadStatus");
      if(status){status.textContent=(replaceSrc?"Substituindo página":"Enviando página "+(i+1)+" de "+queue.length)+"…";status.setAttribute("data-state","working");}
      var result=await request({
        action:"comic-page-upload",
        id:selectedId,
        replaceSrc:replaceSrc||"",
        mimeType:optimized.mimeType,
        contentBase64:optimized.contentBase64,
        thumbnailMimeType:optimized.thumbnailMimeType,
        thumbnailBase64:optimized.thumbnailBase64,
        label:page&&page.label?page.label:"",
        alt:page&&page.alt?page.alt:""
      });
      catalog=result.catalog||catalog;
    }
    pendingReplaceSrc="";render();notifyReader(selectedId);
    var statusDone=el("comicManagerUploadStatus");
    if(statusDone){statusDone.textContent=replaceSrc?"Página substituída.":queue.length+" página"+(queue.length===1?" adicionada.":"s adicionadas.");statusDone.setAttribute("data-state","success");}
    showToast(replaceSrc?"Página substituída.":"Páginas adicionadas.","success",3500);
  }catch(error){
    console.error(error);
    var statusError=el("comicManagerUploadStatus");
    if(statusError){statusError.textContent=error.message||"Falha no upload.";statusError.setAttribute("data-state","error");}
    showToast(error.message||"Falha ao enviar páginas.","error",6000);
  }finally{setBusy(false,"");}
}

function collectPageRows(){
  return Array.from(document.querySelectorAll("#comicManagerPagesList .comic-manager-page-row")).map(function(row){
    return {
      src:row.getAttribute("data-comic-page-row")||"",
      label:(row.querySelector("[data-page-label]")||{}).value||"",
      alt:(row.querySelector("[data-page-alt]")||{}).value||""
    };
  });
}

async function savePages(){
  if(!selectedId)return;
  setBusy(true,"Salvando ordem e textos das páginas…");
  try{
    var result=await request({action:"comic-pages-update",id:selectedId,pages:collectPageRows()});
    catalog=result.catalog||catalog;render();notifyReader(selectedId);
    showToast("Ordem e textos das páginas salvos.","success",3500);
  }catch(error){console.error(error);showToast(error.message||"Falha ao salvar páginas.","error",5500);}
  finally{setBusy(false,"");}
}

function deletePage(src){
  var row=selected();if(!row||!src)return;
  var index=(row.pages||[]).findIndex(function(page){return page.src===src;});
  showConfirm("Excluir página","Remover a página "+(index+1)+" desta edição e apagar o arquivo do projeto?",async function(){
    setBusy(true,"Excluindo página…");
    try{
      var result=await request({action:"comic-page-delete",id:selectedId,src:src});
      catalog=result.catalog||catalog;render();notifyReader(selectedId);showToast("Página excluída.","success",3200);
    }catch(error){showToast(error.message||"Falha ao excluir página.","error",5500);}
    finally{setBusy(false,"");}
  });
}

function notifyReader(editionId){
  var reader=window.TerraOmegaApp&&window.TerraOmegaApp.comicReader;
  if(reader&&reader.reload)reader.reload({editionId:editionId||""}).catch(function(){});
}

function openReader(){
  var row=selected();if(!row)return;
  close();
  var tab=document.querySelector('.tab-btn[data-tab="tab-home"]');if(tab)tab.click();
  setTimeout(function(){
    var sub=document.querySelector('#tab-home .sidebar-item[data-sub="sub-capa-quadrinhos"]');if(sub)sub.click();
    setTimeout(function(){
      var reader=window.TerraOmegaApp&&window.TerraOmegaApp.comicReader;
      if(reader&&reader.reload)reader.reload({editionId:row.id});
    },120);
  },80);
}

async function open(){
  ensureModal();
  var b=backend();
  if(!b||!b.isAuthenticated||!b.isAuthenticated()){
    showToast("Entre como editor para administrar quadrinhos.","warning",4500);return;
  }
  var modal=el("comicManagerModal");modal.classList.add("show");document.body.style.overflow="hidden";
  setBusy(true,"Carregando catálogo…");
  try{
    await load();
    if(selectedId&&!selected())selectedId="";
    if(!selectedId&&catalog.series.length)selectedId=catalog.series[0].id;
    newDraft=false;render();
  }catch(error){showToast(error.message||"Falha ao carregar quadrinhos.","error",5500);}
  finally{setBusy(false,"");}
}

function close(){
  var modal=el("comicManagerModal");if(modal)modal.classList.remove("show");
  document.body.style.overflow="";
}

window.TerraOmegaApp.comicManager={open:open,close:close,reload:load};

})();