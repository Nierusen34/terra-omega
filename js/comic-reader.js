(function(){
"use strict";

window.TerraOmegaApp=window.TerraOmegaApp||{};

var catalog=null;
var seriesIndex=0;
var pageIndex=0;
var mounted=false;
var loadingPromise=null;

function el(id){return document.getElementById(id);}

function currentSeries(){
  var rows=catalog&&Array.isArray(catalog.series)?catalog.series:[];
  return rows[seriesIndex]||null;
}

function pages(){
  var series=currentSeries();
  return series&&Array.isArray(series.pages)?series.pages:[];
}

function active(){
  var section=el('sub-capa-quadrinhos');
  return !!(section&&section.classList.contains('active'));
}

function setEmpty(message){
  var image=el('comicPageImage');
  var empty=el('comicReaderEmpty');
  if(image){image.hidden=true;image.removeAttribute('src');image.alt='';}
  if(empty){
    empty.hidden=false;
    var label=empty.querySelector('span');
    if(label&&message)label.textContent=message;
  }
}

function preload(index){
  var list=pages();
  var row=list[index];
  if(!row||!row.src)return;
  var img=new Image();
  img.src=row.src;
}

function renderSeriesOptions(){
  var select=el('comicSeriesSelect');
  if(!select)return;
  var rows=catalog&&Array.isArray(catalog.series)?catalog.series:[];
  if(!rows.length){
    select.innerHTML='<option value="">Nenhuma coleção publicada</option>';
    select.disabled=true;
    return;
  }
  select.disabled=false;
  select.innerHTML=rows.map(function(row,index){
    return '<option value="'+index+'">'+String(row.title||('História '+(index+1)))+'</option>';
  }).join('');
  select.value=String(seriesIndex);
}

function render(){
  if(!catalog)return;

  var series=currentSeries();
  var list=pages();
  var title=el('comicSeriesTitle');
  var desc=el('comicSeriesDescription');
  var label=el('comicPageLabel');
  var counter=el('comicPageCounter');
  var prev=el('comicPrevBtn');
  var next=el('comicNextBtn');
  var image=el('comicPageImage');
  var empty=el('comicReaderEmpty');
  var thumbs=el('comicThumbs');

  if(title)title.textContent=series&&series.title?series.title:'Terra Omega';
  if(desc)desc.textContent=series&&series.description?series.description:'Arquivo de páginas sequenciais do Universo Oblívio.';

  if(!series||!list.length){
    pageIndex=0;
    setEmpty(series?'Esta coleção está pronta para receber páginas.':'Nenhuma coleção de quadrinhos foi publicada ainda.');
    if(label)label.textContent='Nenhuma página publicada';
    if(counter)counter.textContent='—';
    if(prev)prev.disabled=true;
    if(next)next.disabled=true;
    if(thumbs)thumbs.innerHTML='';
    return;
  }

  pageIndex=Math.max(0,Math.min(pageIndex,list.length-1));
  var page=list[pageIndex];

  if(empty)empty.hidden=true;
  if(image){
    image.hidden=false;
    image.src=page.src;
    image.alt=page.alt||((series.title||'Quadrinho')+' — página '+(pageIndex+1));
  }
  if(label)label.textContent=page.label||('Página '+(pageIndex+1));
  if(counter)counter.textContent=(pageIndex+1)+' / '+list.length;
  if(prev)prev.disabled=pageIndex<=0;
  if(next)next.disabled=pageIndex>=list.length-1;

  if(thumbs){
    thumbs.innerHTML=list.map(function(item,index){
      return '<button type="button" class="comic-thumb'+(index===pageIndex?' active':'')+'" data-comic-page="'+index+'" data-page="'+(index+1)+'" aria-label="Abrir página '+(index+1)+'">'+
        '<img src="'+item.src+'" alt="" loading="lazy" decoding="async">'+
      '</button>';
    }).join('');

    thumbs.querySelectorAll('[data-comic-page]').forEach(function(button){
      button.addEventListener('click',function(){
        pageIndex=Number(button.getAttribute('data-comic-page'))||0;
        render();
        var stage=el('comicReaderStage');
        if(stage)stage.scrollTo({top:0,left:0,behavior:'auto'});
      });
    });
  }

  preload(pageIndex+1);
}

function move(delta){
  var list=pages();
  if(!list.length)return;
  var target=pageIndex+delta;
  if(target<0||target>=list.length)return;
  pageIndex=target;
  render();
  var stage=el('comicReaderStage');
  if(stage)stage.scrollTo({top:0,left:0,behavior:'auto'});
}

function bind(){
  if(mounted)return;
  mounted=true;

  var select=el('comicSeriesSelect');
  var prev=el('comicPrevBtn');
  var next=el('comicNextBtn');
  var fullscreen=el('comicFullscreenBtn');
  var stage=el('comicReaderStage');

  if(select)select.addEventListener('change',function(){
    seriesIndex=Math.max(0,Number(select.value)||0);
    pageIndex=0;
    render();
  });
  if(prev)prev.addEventListener('click',function(){move(-1);});
  if(next)next.addEventListener('click',function(){move(1);});
  if(fullscreen)fullscreen.addEventListener('click',function(){
    if(!stage)return;
    if(document.fullscreenElement){
      document.exitFullscreen&&document.exitFullscreen();
    }else if(stage.requestFullscreen){
      stage.requestFullscreen().catch(function(){});
    }else if(stage.webkitRequestFullscreen){
      stage.webkitRequestFullscreen();
    }
  });
  if(stage)stage.addEventListener('keydown',function(event){
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  });
  document.addEventListener('keydown',function(event){
    if(!active())return;
    var target=event.target;
    if(target&&/INPUT|TEXTAREA|SELECT/.test(target.tagName))return;
    if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
    if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  });
}

async function load(){
  if(catalog)return catalog;
  if(loadingPromise)return loadingPromise;

  loadingPromise=fetch('data/comics.json',{cache:'no-store'})
    .then(function(response){
      if(!response.ok)throw new Error('Catálogo de quadrinhos indisponível.');
      return response.json();
    })
    .then(function(data){
      catalog=data&&typeof data==='object'?data:{series:[]};
      return catalog;
    })
    .catch(function(error){
      console.error('Terra Omega Comics:',error);
      catalog={series:[]};
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

window.TerraOmegaApp.comicReader={
  mount:mount,
  reload:function(){catalog=null;seriesIndex=0;pageIndex=0;return mount();},
  next:function(){move(1);},
  previous:function(){move(-1);}
};

if(active())mount();

})();