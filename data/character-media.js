(function(){
"use strict";

window.TerraOmegaData = window.TerraOmegaData || {};

// Metadados visuais de personagens.
// src vazio = usar placeholder de Terra Omega.
window.TerraOmegaData.characterMedia = {
  "Tristan Queen": {
    "src": "images/characters/tristan-queen.jpg",
    "alt": "Tristan Queen",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 10,
        "y": 4,
        "zoom": 1.55
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Riot": {
    "src": "images/characters/riot.jpg",
    "alt": "Riot",
    "source": "local",
    "credit": ""
  },
  "M'ark": {
    "src": "images/characters/mark.jpg",
    "alt": "M'ark",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 64,
        "y": 0,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 70,
        "y": 6,
        "zoom": 2.5
      }
    }
  },
  "Kendra Saunders": {
    "src": "",
    "alt": "Kendra Saunders",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Kendra Saunders"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 73,
        "y": 24,
        "zoom": 1.95
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Lobo": {
    "src": "",
    "alt": "Lobo",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Lobo (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 47,
        "y": 38,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 53,
        "zoom": 1.5
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "M'gann M'orzz": {
    "src": "",
    "alt": "M'gann M'orzz",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://static.wikia.nocookie.net/book-of-heroes-and-villains/images/c/cf/Ms_Martian.jpg/revision/latest?cb=20220125212755",
      "fallbackWikiTitle": "M'gann M'orzz (Prime Earth)",
      "sourceLabel": "Google Imagens · imagem selecionada"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 46,
        "y": 14,
        "zoom": 1.4
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 1
      }
    }
  },
  "J'onn J'onzz": {
    "src": "",
    "alt": "J'onn J'onzz",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "J'onn J'onzz (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 19,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 25,
        "zoom": 1.65
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Oliver Queen": {
    "src": "",
    "alt": "Oliver Queen",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://i.pinimg.com/736x/49/cb/fa/49cbfa383b18e113e26d6d97630bc24a.jpg",
      "fallbackWikiTitle": "Oliver Queen (Prime Earth)",
      "sourceLabel": "Google Imagens · imagem selecionada"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 74,
        "y": 0,
        "zoom": 1.85
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Dinah Lance": {
    "src": "",
    "alt": "Dinah Lance",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://i.pinimg.com/736x/7c/c8/3f/7cc83fd1736c5f0544a82fe2cb56eb2f.jpg",
      "sourceLabel": "Google Imagens · Dan Mora"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 29,
        "zoom": 1.15
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Connor Hawke": {
    "src": "",
    "alt": "Connor Hawke",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://comicvine.gamespot.com/a/uploads/original/11156/111564182/9455701-chawke.jpg",
      "fallbackWikiTitle": "Connor Hawke",
      "sourceLabel": "Google Imagens · imagem selecionada"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 10,
        "y": 8,
        "zoom": 1.45
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Jason Todd": {
    "src": "images/characters/jason-todd.jpg",
    "alt": "Jason Todd",
    "source": "local",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Jason Todd (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 47,
        "y": 0,
        "zoom": 2
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Conner Kent": {
    "src": "images/characters/conner-kent.jpg",
    "alt": "Conner Kent",
    "source": "local",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Kon-El (Prime Earth)"
    }
  },
  "Bruce Wayne": {
    "src": "",
    "alt": "Bruce Wayne",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Bruce Wayne (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 3,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 1
      }
    }
  },
  "Dick Grayson": {
    "src": "",
    "alt": "Dick Grayson",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Richard Grayson (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Barbara Gordon": {
    "src": "",
    "alt": "Barbara Gordon",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://i.pinimg.com/736x/ee/f0/38/eef0385e1a2dac794f9794e528db89d5.jpg",
      "sourceLabel": "Google Imagens · Dan Mora"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Damian Wayne": {
    "src": "",
    "alt": "Damian Wayne",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://i.pinimg.com/564x/8e/1f/54/8e1f54f9b733e3623dcd4af973af9acd.jpg",
      "fallbackWikiTitle": "Damian Wayne (Prime Earth)",
      "sourceLabel": "Google Imagens · imagem selecionada"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 33,
        "zoom": 1.25
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Tim Drake": {
    "src": "",
    "alt": "Tim Drake",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Timothy Drake (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 22,
        "y": 8,
        "zoom": 1.6
      }
    }
  },
  "Verity Pennyworth": {
    "src": "images/characters/verity-pennyworth.jpg",
    "alt": "Verity Pennyworth",
    "source": "local",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Verity Pennyworth"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 46,
        "y": 8,
        "zoom": 1.6
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Lian Harper": {
    "src": "images/characters/lian-harper.jpg",
    "alt": "Lian Harper",
    "source": "local",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Lian Harper (Prime Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 2.1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Roy Harper": {
    "src": "",
    "alt": "Roy Harper",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "external-url",
      "imageUrl": "https://i.redd.it/uy1lm1c8ch7b1.jpg",
      "fallbackWikiTitle": "Roy Harper (Prime Earth)",
      "sourceLabel": "Google Imagens · imagem selecionada"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 2.05
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 8,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "George Gandenzio Toombs": {
    "src": "images/characters/george-gandenzio-toombs.png",
    "alt": "George Gandenzio Toombs",
    "source": "local",
    "credit": ""
  },
  "Michael Carter": {
    "src": "",
    "alt": "Michael Carter",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Michael Carter (New Earth)"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 63,
        "zoom": 1.05
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Rex Mason": {
    "src": "",
    "alt": "Rex Mason",
    "source": "auto",
    "credit": "",
    "auto": {
      "provider": "dc-fandom",
      "wikiTitle": "Metamorpho"
    },
    "framing": {
      "card": {
        "fit": "cover",
        "x": 72,
        "y": 7,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 65,
        "y": 9,
        "zoom": 1.85
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Leland Shaw": {
    "src": "images/characters/leland-shaw.jpg",
    "alt": "Leland Shaw",
    "source": "local",
    "credit": ""
  },
  "Alden Mitchell": {
    "src": "images/characters/alden-mitchell.jpg",
    "alt": "Alden Mitchell",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 13,
        "y": 5,
        "zoom": 2
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Geneviève Lachance": {
    "src": "images/characters/genevieve-lachance.jpg",
    "alt": "Geneviève Lachance",
    "source": "local",
    "credit": ""
  },
  "Marcos Jimenez": {
    "src": "images/characters/marcos-jimenez.jpg",
    "alt": "Marcos Jimenez",
    "source": "local",
    "credit": ""
  },
  "Dr. Kenji Tanaka": {
    "src": "images/characters/dr-kenji-tanaka.jpg",
    "alt": "Dr. Kenji Tanaka",
    "source": "local",
    "credit": ""
  },
  "Dr. Ahron Nax": {
    "src": "images/characters/dr-ahron-nax.jpg",
    "alt": "Dr. Ahron Nax",
    "source": "local",
    "credit": ""
  },
  "Silas": {
    "src": "images/characters/silas.jpg",
    "alt": "Silas",
    "source": "local",
    "credit": ""
  },
  "Lila Marlowe": {
    "src": "images/characters/lila-marlowe.jpg",
    "alt": "Lila Marlowe",
    "source": "local",
    "credit": ""
  },
  "Camila Vargas": {
    "src": "images/characters/camila-vargas.jpg",
    "alt": "Camila Vargas",
    "source": "local",
    "credit": ""
  },
  "Alia Hazari": {
    "src": "images/characters/alia-hazari.jpg",
    "alt": "Alia Hazari",
    "source": "local",
    "credit": ""
  },
  "Donovan Mason": {
    "src": "images/characters/donovan-mason.jpg",
    "alt": "Donovan Mason",
    "source": "local",
    "credit": ""
  },
  "Dra. Zara Kovač": {
    "src": "images/characters/dra-zara-kovac.jpg",
    "alt": "Dra. Zara Kovač",
    "source": "local",
    "credit": ""
  },
  "Dra. Anya Petrova": {
    "src": "images/characters/dra-anya-petrova.jpg",
    "alt": "Dra. Anya Petrova",
    "source": "local",
    "credit": ""
  },
  "Roxana \"Roxy\" Sharpe": {
    "src": "images/characters/roxana-roxy-sharpe.jpg",
    "alt": "Roxana \"Roxy\" Sharpe",
    "source": "local",
    "credit": ""
  },
  "Antoine Devereaux": {
    "src": "images/characters/antoine-devereaux.jpg",
    "alt": "Antoine Devereaux",
    "source": "local",
    "credit": ""
  },
  "Matheus Silva": {
    "src": "images/characters/matheus-silva.jpg",
    "alt": "Matheus Silva",
    "source": "local",
    "credit": ""
  },
  "Oficial Leo Martinez": {
    "src": "images/characters/oficial-leo-martinez.jpg",
    "alt": "Oficial Leo Martinez",
    "source": "local",
    "credit": ""
  },
  "Mama Montoya": {
    "src": "images/characters/mama-montoya.jpg",
    "alt": "Mama Montoya",
    "source": "local",
    "credit": ""
  },
  "Hector Ramos": {
    "src": "images/characters/hector-ramos.jpg",
    "alt": "Hector Ramos",
    "source": "local",
    "credit": ""
  },
  "Lina Ramos": {
    "src": "images/characters/lina-ramos.jpg",
    "alt": "Lina Ramos",
    "source": "local",
    "credit": ""
  },
  "Dra. Ana Cruz": {
    "src": "images/characters/dra-ana-cruz.jpg",
    "alt": "Dra. Ana Cruz",
    "source": "local",
    "credit": ""
  },
  "Pops Carter": {
    "src": "images/characters/pops-carter.jpg",
    "alt": "Pops Carter",
    "source": "local",
    "credit": ""
  },
  "Lucia Ortega": {
    "src": "images/characters/lucia-ortega.jpg",
    "alt": "Lucia Ortega",
    "source": "local",
    "credit": ""
  },
  "Dante Rodrigues": {
    "src": "images/characters/dante-rodrigues.jpg",
    "alt": "Dante Rodrigues",
    "source": "local",
    "credit": ""
  },
  "General Markov": {
    "src": "images/characters/general-markov.jpg",
    "alt": "General Markov",
    "source": "local",
    "credit": ""
  },
  "Flinch Archer": {
    "src": "images/characters/flinch-archer.jpg",
    "alt": "Flinch Archer",
    "source": "local",
    "credit": ""
  },
  "Juíza Mariana Sandoval": {
    "src": "images/characters/juiza-mariana-sandoval.jpg",
    "alt": "Juíza Mariana Sandoval",
    "source": "local",
    "credit": ""
  },
  "Julia Reyes": {
    "src": "images/characters/julia-reyes.jpg",
    "alt": "Julia Reyes",
    "source": "local",
    "credit": ""
  },
  "Sofia Navarro": {
    "src": "images/characters/sofia-navarro.jpg",
    "alt": "Sofia Navarro",
    "source": "local",
    "credit": ""
  },
  "Boris Borkov": {
    "src": "images/characters/boris-borkov.jpg",
    "alt": "Boris Borkov",
    "source": "local",
    "credit": ""
  },
  "Osias \"Osi\" Rivers": {
    "src": "images/characters/osias-osi-rivers.jpg",
    "alt": "Osias \"Osi\" Rivers",
    "source": "local",
    "credit": ""
  },
  "Dra. Helen Finch": {
    "src": "images/characters/dra-helen-finch.jpg",
    "alt": "Dra. Helen Finch",
    "source": "local",
    "credit": ""
  },
  "Brigitte Oliveira": {
    "src": "images/characters/brigitte-oliveira.jpg",
    "alt": "Brigitte Oliveira",
    "source": "local",
    "credit": ""
  },
  "Roselie Sterling": {
    "src": "images/characters/roselie-sterling.jpg",
    "alt": "Roselie Sterling",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 2.25
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Misty Kilgore": {
    "src": "images/characters/misty-kilgore.jpg",
    "alt": "Misty Kilgore",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 44,
        "y": 7,
        "zoom": 2.15
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Augusto Salvatierras": {
    "src": "images/characters/augusto-salvatierras.jpg",
    "alt": "Augusto Salvatierras",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 37,
        "y": 14,
        "zoom": 1.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Alonso Salvatierras": {
    "src": "images/characters/alonso-salvatierras.jpg",
    "alt": "Alonso Salvatierras",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 4,
        "zoom": 1.65
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Carmen Duarte": {
    "src": "images/characters/carmen-duarte.jpg",
    "alt": "Carmen Duarte",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 1,
        "zoom": 1.6
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Santiago Salvatierras": {
    "src": "images/characters/santiago-salvatierras.jpg",
    "alt": "Santiago Salvatierras",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 43,
        "y": 0,
        "zoom": 1.65
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Nicola Salvatierras": {
    "src": "images/characters/nicola-salvatierras.jpg",
    "alt": "Nicola Salvatierras",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 10,
        "zoom": 2.1
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Gabriel Salvatierras": {
    "src": "images/characters/gabriel-salvatierras.jpg",
    "alt": "Gabriel Salvatierras",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 29,
        "y": 0,
        "zoom": 2
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 50,
        "zoom": 1
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "isabela Duarte": {
    "src": "images/characters/isabela-duarte.jpg",
    "alt": "isabela Duarte",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 5,
        "zoom": 1.55
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 0,
        "zoom": 1.2
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Carlo Duarte": {
    "src": "images/characters/carlo-duarte.jpg",
    "alt": "Carlo Duarte",
    "source": "local",
    "credit": "",
    "framing": {
      "card": {
        "fit": "cover",
        "x": 50,
        "y": 12,
        "zoom": 2.5
      },
      "sheet": {
        "fit": "cover",
        "x": 50,
        "y": 15,
        "zoom": 1.65
      },
      "graph": {
        "fit": "cover",
        "x": 50,
        "y": 24,
        "zoom": 1
      }
    }
  },
  "Matteo Ferraro": {
    "src": "images/characters/matteo-ferraro.jpg",
    "alt": "Matteo Ferraro",
    "source": "local",
    "credit": ""
  }
};

})();
