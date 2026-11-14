(function(){
"use strict";

/* ===== COMPATIBILIDADE TERRA OMEGA ===== */
var data = window.TerraOmegaData || window.TerraZData || {};
var app = window.TerraOmegaApp || window.TerraZApp || {};
var config = window.TerraOmegaConfig || window.TerraZConfig || {};

window.TerraOmegaData = data;
window.TerraZData = data;
window.TerraOmegaApp = app;
window.TerraZApp = app;
window.TerraOmegaConfig = config;
window.TerraZConfig = config;

var keyPairs = [
  ["terraZ_character_card_size","terraOmega_character_card_size"],
  ["terraZ_editor_session","terraOmega_editor_session"],
  ["terraZ_favorites","terraOmega_favorites"],
  ["terraZ_last_route_v2","terraOmega_last_route_v2"],
  ["terraZ_reading","terraOmega_reading"],
  ["terraZ_session_mode_v1","terraOmega_session_mode_v1"],
  ["terraZ_spoiler_mode","terraOmega_spoiler_mode"],
  ["terraZ_theme","terraOmega_theme"],
  ["terraZ_v1_backups","terraOmega_v1_backups"],
  ["terraZ_v1_edits","terraOmega_v1_edits"],
  ["terraZ_v1_edits_legacy_backup","terraOmega_v1_edits_legacy_backup"]
];
var prefixPairs = [
  ["terraZ_dc_portrait_v2:","terraOmega_dc_portrait_v2:"]
];

function counterpart(key){
  for(var i=0;i<keyPairs.length;i++){
    if(key===keyPairs[i][0]) return keyPairs[i][1];
    if(key===keyPairs[i][1]) return keyPairs[i][0];
  }
  for(var j=0;j<prefixPairs.length;j++){
    if(key.indexOf(prefixPairs[j][0])===0) return prefixPairs[j][1]+key.slice(prefixPairs[j][0].length);
    if(key.indexOf(prefixPairs[j][1])===0) return prefixPairs[j][0]+key.slice(prefixPairs[j][1].length);
  }
  return "";
}

function migrateStore(store){
  if(!store) return;
  keyPairs.forEach(function(pair){
    try{
      var oldValue=store.getItem(pair[0]);
      var newValue=store.getItem(pair[1]);
      if(newValue===null && oldValue!==null) store.setItem(pair[1],oldValue);
      if(oldValue===null && newValue!==null) store.setItem(pair[0],newValue);
    }catch(error){}
  });
  try{
    var keys=[];
    for(var i=0;i<store.length;i++) keys.push(store.key(i));
    keys.forEach(function(key){
      var other=counterpart(String(key||""));
      if(!other || store.getItem(other)!==null) return;
      var value=store.getItem(key);
      if(value!==null) store.setItem(other,value);
    });
  }catch(error){}
}

try{migrateStore(window.localStorage);}catch(error){}
try{migrateStore(window.sessionStorage);}catch(error){}

try{
  var originalSet=Storage.prototype.setItem;
  var originalRemove=Storage.prototype.removeItem;
  Storage.prototype.setItem=function(key,value){
    originalSet.call(this,key,value);
    var other=counterpart(String(key));
    if(other) originalSet.call(this,other,value);
  };
  Storage.prototype.removeItem=function(key){
    originalRemove.call(this,key);
    var other=counterpart(String(key));
    if(other) originalRemove.call(this,other);
  };
}catch(error){}

var eventNames = [
  "admin-foundation-ready","admin-modules-loaded","auth-changed","auto-portrait-resolved",
  "bulk-selection-changed","character-media-changed","characters-rendered","edits-changed",
  "graph-rendered","media-library-changed","network-changed","organizations-changed",
  "private-content-cleared","private-content-loaded","private-profiles-changed",
  "runtime-data-loaded","sessions-rendered","static-deploy-synced","taxonomy-changed",
  "timeline-rendered","visibility-changed"
];

function cloneEvent(event,type){
  var options={bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed};
  if(typeof CustomEvent!=="undefined" && event instanceof CustomEvent){
    options.detail=event.detail;
    return new CustomEvent(type,options);
  }
  return new Event(type,options);
}
function mark(event){
  try{Object.defineProperty(event,"__terraOmegaCompat",{value:true});}
  catch(error){event.__terraOmegaCompat=true;}
  return event;
}
function bridge(from,to){
  document.addEventListener(from,function(event){
    if(event && event.__terraOmegaCompat) return;
    document.dispatchEvent(mark(cloneEvent(event,to)));
  });
}
eventNames.forEach(function(name){
  bridge("terra-z:"+name,"terra-omega:"+name);
  bridge("terra-omega:"+name,"terra-z:"+name);
});

window.TerraOmegaCompat={
  version:1,
  counterpart:counterpart,
  migrate:function(){
    try{migrateStore(window.localStorage);}catch(error){}
    try{migrateStore(window.sessionStorage);}catch(error){}
  }
};

/* ===== NÚCLEO COMPARTILHADO ===== */
function showToast(msg, type, duration){
  type = type || 'info';
  duration = duration || 3000;
  var container = document.getElementById('toastContainer');
  if(!container) return;
  var icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<span class="icon">' + (icons[type]||'ℹ️') + '</span><span class="msg">' + escapeHtml(msg) + '</span>';
  container.appendChild(toast);
  setTimeout(function(){
    toast.classList.add('leaving');
    setTimeout(function(){ if(toast.parentElement) toast.remove(); }, 300);
  }, duration);
}

function showConfirm(title, msg, onConfirm, confirmLabel){
  var modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOk').textContent = confirmLabel || 'Confirmar';
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  var okBtn = document.getElementById('confirmOk');
  var cancelBtn = document.getElementById('confirmCancel');
  function cleanup(){
    modal.classList.remove('show');
    document.body.style.overflow = '';
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  }
  function onOk(){ cleanup(); if(onConfirm) onConfirm(); }
  function onCancel(){ cleanup(); }
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function escapeAttr(s){ return String(s).replace(/"/g, '&quot;'); }
function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

window.TerraOmegaCore = {
  showToast: showToast,
  showConfirm: showConfirm,
  escapeHtml: escapeHtml,
  escapeAttr: escapeAttr,
  escapeRegex: escapeRegex
};
// Terra Omega é o namespace canônico; TerraZ fica somente como alias de compatibilidade.
window.TerraZCore = window.TerraOmegaCore;
window.TerraOmegaApp = window.TerraOmegaApp || window.TerraZApp || {};
window.TerraZApp = window.TerraOmegaApp;
window.showToast = showToast;

/* ===== ATALHOS GLOBAIS ===== */
document.addEventListener('keydown', function(e){
  var app = window.TerraOmegaApp || {};

  if((e.ctrlKey || e.metaKey) && e.key === 's'){
    e.preventDefault();
    if(app.editor && app.editor.isEditing()) app.editor.save();
    else showToast('Ative o modo de edição primeiro (✏️)', 'warning');
  }

  if(e.altKey && e.key === 'ArrowLeft'){
    var fandomModal = document.getElementById('fandomModal');
    if(fandomModal && fandomModal.classList.contains('show') && app.search){
      e.preventDefault();
      app.search.back();
    }
  }

  var presentationModal = document.getElementById('presentationModal');
  if(presentationModal && presentationModal.classList.contains('show') && app.presentation){
    if(e.key === 'ArrowRight'){ e.preventDefault(); app.presentation.next(); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); app.presentation.prev(); }
  }

  if(e.key === 'Escape'){
    if(presentationModal && presentationModal.classList.contains('show') && app.presentation){
      app.presentation.close();
      return;
    }

    var graphModal = document.getElementById('graphEditorModal');
    if(graphModal && graphModal.classList.contains('show') && app.graph){
      app.graph.closeEditor();
      return;
    }

    if(app.navigation && app.navigation.isReading()){
      app.navigation.toggleReading();
      return;
    }

    if(app.navigation){
      app.navigation.closeLightbox();
      app.navigation.closeDrawer();
    }
    if(app.search){
      app.search.closeModal();
      app.search.closePanel();
    }
    if(app.characters) app.characters.close();
    if(app.favorites) app.favorites.close();
  }
});

/* ===== BOOTSTRAP ===== */
document.addEventListener('DOMContentLoaded', function(){
  showToast('Universo Oblívio · Terra Omega · v1.4.0', 'info', 3500);
});

})();
