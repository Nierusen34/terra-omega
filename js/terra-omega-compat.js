(function(){
"use strict";

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
})();