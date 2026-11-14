(function(){
"use strict";

window.TerraOmegaApp = window.TerraOmegaApp || {};
var core = window.TerraOmegaCore;
if(!core) throw new Error('Terra Omega: núcleo não carregado antes de js/media-manager.js');

var showToast = core.showToast;
var showConfirm = core.showConfirm;

function backend(){ return window.TerraOmegaApp && window.TerraOmegaApp.backend; }
function publishing(){ return window.TerraOmegaApp && window.TerraOmegaApp.publishing; }

function canUpload(){
  var b = backend();
  return !!(b && b.isConfigured() && b.isAuthenticated());
}

function readDataUrl(file){
  return new Promise(function(resolve,reject){
    var reader = new FileReader();
    reader.onload = function(){ resolve(reader.result); };
    reader.onerror = function(){ reject(new Error('Não foi possível ler a imagem.')); };
    reader.readAsDataURL(file);
  });
}

async function upload(character,file){
  var b = backend();
  if(!b || !b.isConfigured()) throw new Error('Backend ainda não configurado.');
  if(!b.isAuthenticated()) throw new Error('Faça login como editor antes de enviar uma imagem.');

  if(!file) throw new Error('Selecione uma imagem.');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Use PNG, JPEG ou WebP.');
  if(file.size > 2 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 2 MB.');

  var dataUrl = await readDataUrl(file);
  var result = await b.request('/api/media',{
    method:'POST',
    body:{
      character:character,
      mimeType:file.type,
      contentBase64:dataUrl,
      alt:character,
      credit:''
    }
  });

  window.TerraOmegaData = window.TerraOmegaData || {};
  window.TerraOmegaData.characterMedia = window.TerraOmegaData.characterMedia || {};
  window.TerraOmegaData.characterMedia[character] = Object.assign(
    {},
    window.TerraOmegaData.characterMedia[character] || {},
    {
      src:result.path,
      alt:character,
      source:'local'
    }
  );

  if(window.TerraOmegaApp.characterMedia && window.TerraOmegaApp.characterMedia.refresh){
    window.TerraOmegaApp.characterMedia.refresh(document);
  }

  document.dispatchEvent(new CustomEvent('terra-omega:character-media-changed',{
    detail:{character:character,hasPortrait:true}
  }));

  showToast('Retrato salvo com sucesso.','success',4500);

  var runtime = window.TerraOmegaApp && window.TerraOmegaApp.runtimeData;
  if(runtime && runtime.refresh) runtime.refresh({force:true,bust:result.sha,silent:true});

  var p = publishing();
  if(p && p.trackDeployment && result.status_url){
    p.trackDeployment(result.status_url);
  }

  return result;
}

async function remove(character){
  var b = backend();
  if(!b || !b.isConfigured()) throw new Error('Backend ainda não configurado.');
  if(!b.isAuthenticated()) throw new Error('Faça login como editor antes de remover o retrato.');

  var result = await b.request('/api/media',{
    method:'DELETE',
    body:{character:character}
  });

  window.TerraOmegaData = window.TerraOmegaData || {};
  window.TerraOmegaData.characterMedia = window.TerraOmegaData.characterMedia || {};

  var current = window.TerraOmegaData.characterMedia[character] || {};
  window.TerraOmegaData.characterMedia[character] = Object.assign({},current,{
    src:'',
    source:current.auto ? 'auto' : 'local',
    credit:''
  });

  if(window.TerraOmegaApp.characterMedia && window.TerraOmegaApp.characterMedia.refresh){
    window.TerraOmegaApp.characterMedia.refresh(document);
  }

  document.dispatchEvent(new CustomEvent('terra-omega:character-media-changed',{
    detail:{character:character,hasPortrait:false}
  }));

  showToast('Retrato removido com sucesso.','success',4200);

  var runtime = window.TerraOmegaApp && window.TerraOmegaApp.runtimeData;
  if(runtime && runtime.refresh) runtime.refresh({force:true,bust:result.sha,silent:true});

  var p = publishing();
  if(p && p.trackDeployment && result.status_url){
    p.trackDeployment(result.status_url);
  }

  return result;
}

function requestRemove(character){
  if(!canUpload()){
    showToast('Entre como editor para remover retratos.','warning',5000);
    if(window.TerraOmegaApp.publishing) window.TerraOmegaApp.publishing.open();
    return;
  }

  var media = (window.TerraOmegaData && window.TerraOmegaData.characterMedia) || {};
  var item = media[character] || {};
  var hasAutomatic = !!(item.auto && (
    (item.auto.provider === 'dc-fandom' && item.auto.wikiTitle) ||
    (item.auto.provider === 'external-url' && item.auto.imageUrl)
  ));

  showConfirm(
    'Remover retrato',
    'Remover o retrato atual de ' + character + '? ' +
      (hasAutomatic
        ? 'A ficha voltará a usar a fonte automática configurada.'
        : 'A ficha continuará existindo e voltará a usar o placeholder.'),
    function(){
      remove(character).catch(function(error){
        console.error(error);
        showToast(error.message || 'Falha ao remover retrato.','error',6000);
      });
    },
    'Remover retrato'
  );
}

function choose(character){
  if(!canUpload()){
    showToast('Entre como editor no painel Publicar para enviar retratos.','warning',5000);
    if(window.TerraOmegaApp.publishing) window.TerraOmegaApp.publishing.open();
    return;
  }

  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.style.display = 'none';
  document.body.appendChild(input);

  input.onchange = function(){
    var file = input.files && input.files[0];
    if(!file){ input.remove(); return; }

    showConfirm(
      'Atualizar retrato',
      'Publicar "' + file.name + '" como retrato de ' + character + '?',
      function(){
        upload(character,file).catch(function(err){
          console.error(err);
          showToast(err.message || 'Falha ao enviar retrato','error',6000);
        }).finally(function(){ input.remove(); });
      },
      'Enviar imagem'
    );
  };

  input.click();
}

window.TerraOmegaApp.mediaManager = {
  canUpload:canUpload,
  choose:choose,
  upload:upload,
  remove:remove,
  requestRemove:requestRemove
};

})();