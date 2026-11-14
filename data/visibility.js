(function(){
"use strict";

window.TerraOmegaData = window.TerraOmegaData || {};

window.TerraOmegaData.visibilityLevels = {
  public:  { label:"Público", rank:0, secure:false },
  spoiler: { label:"Spoiler", rank:1, secure:false },
  master:  { label:"Mestre", rank:2, secure:true }
};

window.TerraOmegaData.visibilityAliases = {
  rumor:"spoiler",
  restricted:"spoiler",
  private:"master"
};

window.TerraOmegaData.visibilityPolicy = {
  mode:"public-spoiler-master",
  secure:true,
  warning:"Público aparece para todos. Spoiler fica no bundle, mas é ocultado no Modo Jogador. Mestre é armazenado criptografado e entregue somente ao editor autenticado."
};

})();
