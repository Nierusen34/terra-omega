(function(){
"use strict";

window.TerraOmegaApp=window.TerraOmegaApp||{};

var catalog=null;
var editions=[];
var seriesIndex=0;
var pageIndex=0;
var mounted=false;
var loadingPromise=null;
var viewMode="single";
var fitMode="screen";
var customZoom=1;
var thumbsVisible=true;

var VIEW_KEY="terraOmega_comic_view";
var FIT_KEY="terraOmega_comic_fit";
var THUMBS_KEY="terraOmega_comic_thumbs";
var ZOOM_KEY="terraOmega_comic_zoom";

function el(id){return document.getElementById(id);}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

function loadPreference(key,fallback){
  try{
    var value=localStorage.getItem(key);
    return value===null?fallback:value;
  }catch(error){return fallback;}
}
function savePreference(key,value){
  try{localStorage.setItem(key,String(value));}catch(error){}
}

function hydratePreferences(){
  var savedView=loadPreference(VIEW_KEY,"single");
  if(["single","spread","pair","continuous"].indexOf(savedView)!==-1)viewMode=savedView;
  var savedFit=loadPreference(FIT_KEY,"screen");
  if(["screen","width","actual","custom"].indexOf(savedFit)!==-1)fitMode=savedFit;
  customZoom=clamp(Number(loadPreference(ZOOM_KEY,"1"))||1,.5,2.5);
  thumbsVisible=loadPreference(THUMBS_KEY,"1")!=="0";
}

function publishedEditions(data){
  var rows=data&&Array.isArray(data.series)?data.series:[];
  return rows.filter(function(row){return !row||row.status!=="draft";});
}
function currentSeries(){return editions[seriesIndex]||null;}
function pages(){
  var series=currentSeries();
  return series&&Array.isArray(series.pages)?series.pages:[];
}
function active(){
  var section=el("sub-capa-quadrinhos");
  return !!(section&&section.classList.contains("active"));
}

function pageRange(){
  var list=pages();
  if(!list.length)return [];
  pageIndex=clamp(pageIndex,0,list.length-1);

  if(viewMode==="continuous")return list.map(function(_,i){return i;});
  if(viewMode==="pair"){
    var start=Math.floor(pageIndex/2)*2;
    return [start,start+1].filter(function(i){return i<list.length;});
  }
  if(viewMode==="spread"){
    if(pageIndex===0)return [0];
    var spreadStart=pageIndex%2===0?pageIndex-1:pageIndex;
    return [spreadStart,spreadStart+1].filter(function(i){return i<list.length;});
  }
  return [pageIndex];
}

function rangeLabel(indices){
  var list=pages();
  if(!indices.length||!list.length)return "—";
  if(viewMode==="continuous")return (pageIndex+1)+" / "+list.length;
  var first=indices[0]+1;
  var last=indices[indices.length-1]+1;
  return (first===last?String(first):(first+"–"+last))+" / "+list.length;
}

function setEmpty(message){
  var viewport=el("comicPagesViewport");
  var empty=el("comicReaderEmpty");
  if(viewport){viewport.hidden=true;viewport.innerHTML="";}
  if(empty){
    empty.hidden=false;
    var label=empty.querySelector("span");
    if(label&&message)label.textContent=message;
  }
}

function imageMarkup(item,index){
  var alt=item.alt||((currentSeries()&&currentSeries().title||"Quadrinho")+" — página "+(index+1));
  return '<figure class="comic-page-frame" data-comic-rendered-page="'+index+'">'+
    '<img class="comic-page-image" src="'+escapeAttribute(item.src)+'" alt="'+escapeAttribute(alt)+'" draggable="false" decoding="async">'+
    '<figcaption>Página '+(index+1)+'</figcaption>'+
  '</figure>';
}
function escapeAttribute(value){
  return String(value||"")
    .replace(/&/g,"&amp;").replace(/"/g,"&quot;")
    .replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function applySizing(){
  var reader=el("comicReader");
  var viewport=el("comicPagesViewport");
  if(!reader||!viewport)return;

  reader.setAttribute("data-view-mode",viewMode);
  reader.setAttribute("data-fit-mode",fitMode);
  viewport.style.setProperty("--comic-zoom",String(customZoom));

  viewport.querySelectorAll(".comic-page-image").forEach(function(image){
    image.style.width="";
    image.style.maxWidth="";
    image.style.maxHeight="";
    if(fitMode==="custom"){
      var apply=function(){
        if(image.naturalWidth) image.style.width=Math.round(image.naturalWidth*customZoom)+"px";
      };
      if(image.complete)apply(); else image.addEventListener("load",apply,{once:true});
    }
  });

  var label=el("comicZoomLabel");
  if(label){
    if(fitMode==="screen")label.textContent="Tela";
    else if(fitMode==="width")label.textContent="Largura";
    else if(fitMode==="actual")label.textContent="100%";
    else label.textContent=Math.round(customZoom*100)+"%";
  }

  document.querySelectorAll("[data-comic-fit]").forEach(function(button){
    button.classList.toggle("active",button.getAttribute("data-comic-fit")===fitMode);
  });
}

function renderSeriesOptions(){
  var select=el("comicSeriesSelect");
  if(!select)return;
  if(!editions.length){
    select.innerHTML='<option value="">Nenhuma edição publicada</option>';
    select.disabled=true;
    return;
  }
  select.disabled=false;
  select.innerHTML=editions.map(function(row,index){
    var collection=row.collection?row.collection+" · ":"";
    return '<option value="'+index+'">'+escapeAttribute(collection+(row.title||("Edição "+(index+1))))+'</option>';
  }).join("");
  select.value=String(seriesIndex);
}

function updateViewButtons(){
  document.querySelectorAll("[data-comic-view]").forEach(function(button){
    var isActive=button.getAttribute("data-comic-view")===viewMode;
    button.classList.toggle("active",isActive);
    button.setAttribute("aria-pressed",isActive?"true":"false");
  });
}

function updateThumbs(){
  var wrap=el("comicThumbsWrap");
  var button=el("comicThumbToggleBtn");
  if(wrap)wrap.hidden=!thumbsVisible;
  if(button){
    button.classList.toggle("active",thumbsVisible);
    button.setAttribute("aria-pressed",thumbsVisible?"true":"false");
  }
}

function renderThumbs(){
  var root=el("comicThumbs");
  var list=pages();
  if(!root)return;
  var visibleIndices=pageRange();

  root.innerHTML=list.map(function(item,index){
    return '<button type="button" class="comic-thumb'+(visibleIndices.indexOf(index)!==-1?' active':'')+'" data-comic-page="'+index+'" data-page="'+(index+1)+'" aria-label="Abrir página '+(index+1)+'">'+
      '<img src="'+escapeAttribute(item.src)+'" alt="" loading="lazy" decoding="async">'+
    '</button>';
  }).join("");

  root.querySelectorAll("[data-comic-page]").forEach(function(button){
    button.addEventListener("click",function(){
      goTo(Number(button.getAttribute("data-comic-page"))||0,true);
    });
  });

  var activeThumb=root.querySelector(".comic-thumb.active");
  if(activeThumb&&thumbsVisible){
    try{activeThumb.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});}catch(error){}
  }
}

function render(){
  if(!catalog)return;

  var series=currentSeries();
  var list=pages();
  var title=el("comicSeriesTitle");
  var collection=el("comicCollectionLabel");
  var desc=el("comicSeriesDescription");
  var label=el("comicPageLabel");
  var counter=el("comicPageCounter");
  var jump=el("comicPageJump");
  var prev=el("comicPrevBtn");
  var next=el("comicNextBtn");
  var first=el("comicFirstBtn");
  var last=el("comicLastBtn");
  var viewport=el("comicPagesViewport");
  var empty=el("comicReaderEmpty");

  if(title)title.textContent=series&&series.title?series.title:"Terra Omega";
  if(collection)collection.textContent=series&&series.collection?series.collection:"Universo Oblívio";
  if(desc)desc.textContent=series&&series.description?series.description:"Arquivo de páginas sequenciais do Universo Oblívio.";

  if(!series||!list.length){
    pageIndex=0;
    setEmpty(series?"Esta edição está pronta para receber páginas.":"Nenhuma edição de quadrinhos foi publicada ainda.");
    if(label)label.textContent="Nenhuma página publicada";
    if(counter)counter.textContent="—";
    if(jump){jump.value="";jump.max="1";jump.disabled=true;}
    [prev,next,first,last].forEach(function(button){if(button)button.disabled=true;});
    var thumbs=el("comicThumbs");if(thumbs)thumbs.innerHTML="";
    updateViewButtons();updateThumbs();applySizing();
    return;
  }

  pageIndex=clamp(pageIndex,0,list.length-1);
  var indices=pageRange();

  if(empty)empty.hidden=true;
  if(viewport){
    viewport.hidden=false;
    viewport.innerHTML=indices.map(function(index){return imageMarkup(list[index],index);}).join("");
    viewport.querySelectorAll("[data-comic-rendered-page]").forEach(function(frame){
      frame.addEventListener("click",function(){
        var idx=Number(frame.getAttribute("data-comic-rendered-page"));
        if(Number.isFinite(idx))pageIndex=idx;
        renderThumbs();
      });
    });
  }

  if(label){
    var current=list[pageIndex];
    label.textContent=current&&current.label?current.label:("Página "+(pageIndex+1));
  }
  if(counter)counter.textContent=rangeLabel(indices);
  if(jump){jump.disabled=false;jump.max=String(list.length);jump.value=String(pageIndex+1);}

  var atStart=pageIndex<=0;
  var atEnd=pageIndex>=list.length-1 || indices.indexOf(list.length-1)!==-1;
  if(prev)prev.disabled=atStart;
  if(first)first.disabled=atStart;
  if(next)next.disabled=atEnd;
  if(last)last.disabled=atEnd;

  updateViewButtons();
  updateThumbs();
  renderThumbs();
  applySizing();

  preloadAround();
}

function preloadAround(){
  var list=pages();
  [pageIndex+1,pageIndex+2,pageIndex-1].forEach(function(index){
    var row=list[index];if(!row||!row.src)return;
    var img=new Image();img.src=row.src;
  });
}

function normalizeIndexForView(index){
  var list=pages();
  index=clamp(index,0,Math.max(0,list.length-1));
  if(viewMode==="pair")return Math.floor(index/2)*2;
  if(viewMode==="spread"&&index>0)return index%2===0?index-1:index;
  return index;
}

function goTo(index,scroll){
  var list=pages();
  if(!list.length)return;
  pageIndex=normalizeIndexForView(index);
  render();

  if(viewMode==="continuous"&&scroll){
    requestAnimationFrame(function(){
      var frame=document.querySelector('[data-comic-rendered-page="'+pageIndex+'"]');
      if(frame)frame.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }else if(scroll){
    var stage=el("comicReaderStage");
    if(stage)stage.scrollTo({top:0,left:0,behavior:"auto"});
  }
}

function move(direction){
  var list=pages();if(!list.length)return;
  var step=1;
  if(viewMode==="pair")step=2;
  if(viewMode==="spread"){
    if(direction>0){
      if(pageIndex===0)goTo(1,true); else goTo(pageIndex+2,true);
    }else{
      if(pageIndex<=1)goTo(0,true); else goTo(pageIndex-2,true);
    }
    return;
  }
  goTo(pageIndex+(direction*step),true);
}

function setView(mode){
  if(["single","spread","pair","continuous"].indexOf(mode)===-1)return;
  viewMode=mode;
  pageIndex=normalizeIndexForView(pageIndex);
  savePreference(VIEW_KEY,viewMode);
  render();
}

function setFit(mode){
  if(["screen","width","actual","custom"].indexOf(mode)===-1)return;
  fitMode=mode;
  if(mode==="actual")customZoom=1;
  savePreference(FIT_KEY,fitMode);
  savePreference(ZOOM_KEY,customZoom);
  applySizing();
}

function zoom(delta){
  if(fitMode!=="custom"){
    customZoom=fitMode==="actual"?1:1;
    fitMode="custom";
  }
  customZoom=clamp(Math.round((customZoom+delta)*10)/10,.5,2.5);
  savePreference(FIT_KEY,fitMode);
  savePreference(ZOOM_KEY,customZoom);
  applySizing();
}

function toggleFullscreen(){
  var reader=el("comicReader");
  if(!reader)return;
  if(document.fullscreenElement){
    if(document.exitFullscreen)document.exitFullscreen();
  }else if(reader.requestFullscreen){
    reader.requestFullscreen().catch(function(){});
  }else if(reader.webkitRequestFullscreen){
    reader.webkitRequestFullscreen();
  }
}

function bind(){
  if(mounted)return;
  mounted=true;
  hydratePreferences();

  var select=el("comicSeriesSelect");
  var prev=el("comicPrevBtn"),next=el("comicNextBtn");
  var first=el("comicFirstBtn"),last=el("comicLastBtn");
  var jump=el("comicPageJump");
  var fullscreen=el("comicFullscreenBtn");
  var thumbToggle=el("comicThumbToggleBtn");
  var zoomIn=el("comicZoomInBtn"),zoomOut=el("comicZoomOutBtn");

  if(select)select.addEventListener("change",function(){
    seriesIndex=clamp(Number(select.value)||0,0,Math.max(0,editions.length-1));
    pageIndex=0;render();
  });
  if(prev)prev.addEventListener("click",function(){move(-1);});
  if(next)next.addEventListener("click",function(){move(1);});
  if(first)first.addEventListener("click",function(){goTo(0,true);});
  if(last)last.addEventListener("click",function(){goTo(Math.max(0,pages().length-1),true);});
  if(jump){
    var jumpNow=function(){
      var value=Number(jump.value);
      if(Number.isFinite(value))goTo(value-1,true);
    };
    jump.addEventListener("change",jumpNow);
    jump.addEventListener("keydown",function(event){if(event.key==="Enter"){event.preventDefault();jumpNow();}});
  }
  if(fullscreen)fullscreen.addEventListener("click",toggleFullscreen);
  if(zoomIn)zoomIn.addEventListener("click",function(){zoom(.1);});
  if(zoomOut)zoomOut.addEventListener("click",function(){zoom(-.1);});
  if(thumbToggle)thumbToggle.addEventListener("click",function(){
    thumbsVisible=!thumbsVisible;savePreference(THUMBS_KEY,thumbsVisible?"1":"0");updateThumbs();
  });

  document.querySelectorAll("[data-comic-view]").forEach(function(button){
    button.addEventListener("click",function(){setView(button.getAttribute("data-comic-view"));});
  });
  document.querySelectorAll("[data-comic-fit]").forEach(function(button){
    button.addEventListener("click",function(){setFit(button.getAttribute("data-comic-fit"));});
  });

  document.addEventListener("keydown",function(event){
    if(!active())return;
    var target=event.target;
    if(target&&/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
    if(event.key==="ArrowLeft"){event.preventDefault();move(-1);}
    if(event.key==="ArrowRight"){event.preventDefault();move(1);}
    if(event.key==="Home"){event.preventDefault();goTo(0,true);}
    if(event.key==="End"){event.preventDefault();goTo(Math.max(0,pages().length-1),true);}
    if(event.key==="+"||event.key==="="){event.preventDefault();zoom(.1);}
    if(event.key==="-"){event.preventDefault();zoom(-.1);}
    if(event.key.toLowerCase()==="f"){event.preventDefault();setFit("screen");}
    if(event.key.toLowerCase()==="w"){event.preventDefault();setFit("width");}
    if(event.key==="1"){event.preventDefault();setFit("actual");}
  });

  document.addEventListener("fullscreenchange",function(){
    var button=el("comicFullscreenBtn");
    if(button)button.classList.toggle("active",!!document.fullscreenElement);
  });
}

async function load(){
  if(catalog)return catalog;
  if(loadingPromise)return loadingPromise;

  loadingPromise=fetch("data/comics.json?bust="+Date.now(),{cache:"no-store"})
    .then(function(response){
      if(!response.ok)throw new Error("Catálogo de quadrinhos indisponível.");
      return response.json();
    })
    .then(function(data){
      catalog=data&&typeof data==="object"?data:{series:[]};
      editions=publishedEditions(catalog);
      seriesIndex=clamp(seriesIndex,0,Math.max(0,editions.length-1));
      return catalog;
    })
    .catch(function(error){
      console.error("Terra Omega Comics:",error);
      catalog={series:[]};editions=[];
      return catalog;
    })
    .finally(function(){loadingPromise=null;});

  return loadingPromise;
}

async function mount(){
  bind();
  await load();
  renderSeriesOptions();
  render();
}

async function reload(options){
  var currentId=currentSeries()&&currentSeries().id;
  catalog=null;editions=[];loadingPromise=null;
  await load();
  if(currentId){
    var found=editions.findIndex(function(row){return row&&row.id===currentId;});
    if(found>=0)seriesIndex=found;
  }
  if(options&&options.editionId){
    var target=editions.findIndex(function(row){return row&&row.id===options.editionId;});
    if(target>=0)seriesIndex=target;
  }
  pageIndex=0;
  renderSeriesOptions();
  render();
}

window.TerraOmegaApp.comicReader={
  mount:mount,
  reload:reload,
  next:function(){move(1);},
  previous:function(){move(-1);},
  goTo:goTo,
  setView:setView,
  setFit:setFit,
  getState:function(){return {viewMode:viewMode,fitMode:fitMode,pageIndex:pageIndex,edition:currentSeries()};}
};

if(active())mount();

})();