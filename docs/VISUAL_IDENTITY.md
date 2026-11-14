# Identidade visual — Universo Oblívio / Terra Omega

## Hierarquia de marca

- **Universo Oblívio** identifica o universo ficcional e sua continuidade narrativa.
- **Terra Omega** identifica o mundo central da campanha, incluindo Vanguard Bay e as demais localidades.
- **Dossiê Central** é a apresentação editorial do arquivo de campanha.

A URL, o repositório e os identificadores técnicos antigos permanecem estáveis para preservar compatibilidade.

## Direção criativa

A identidade parte do conceito C anteriormente aprovado: **Dossiê Terra Z**. A linguagem visual é a de um arquivo investigativo premium, com atmosfera de graphic novel sofisticada, mistério e documentação editorial.

A capa usa a montagem investigativa já aprovada, agora referenciada como `images/editorial/dossie-terra-omega.webp`. A imagem é deliberadamente livre de logotipos e textos embutidos para que possa continuar sendo reutilizada sem conflito de nomenclatura.

## Paleta principal

| Função | Claro | Escuro |
|---|---|---|
| Papel / superfície | `#E8DFCC` / `#F3ECDC` | `#1B171D` / `#242027` |
| Fundo | `#D8CEB9` | `#131116` |
| Texto principal | `#211A18` | `#E7DECE` |
| Dourado envelhecido | `#8D6A3D` | `#C2A16A` |
| Vinho discreto | `#742F3D` | `#A05B68` |
| Linhas e divisórias | `#A58B63` | `#62503A` |

O dourado é reservado para hierarquia, molduras e pequenos destaques. O vinho funciona como cor secundária. Evitar neon, gradientes saturados e grandes áreas de vermelho.

## Tipografia

- **Cormorant Garamond:** títulos editoriais, marca e chamadas.
- **Lora:** leitura contínua e texto descritivo.
- **Share Tech Mono:** metadados, códigos, datas e pequenas etiquetas de arquivo.

## Emblema

O emblema combina um ômega estilizado, um eclipse e uma órbita. A forma representa a identidade de Terra Omega e o caráter multiversal do Universo Oblívio. É usado no cabeçalho global e no PWA.

A antiga marca neon VB é específica de Vanguard Bay; não deve representar o Universo Oblívio como um todo.

## Sistema editorial

- O cabeçalho global identifica Universo Oblívio / Terra Omega.
- Os mastheads **O Farol de Vanguard**, **VBN**, **O Diário do Cais** e **A Sentinela Dourada** continuam sendo publicações internas do cenário e mantêm suas identidades próprias.
- A capa usa o selo “Dossiê Central · Universo Oblívio” e a montagem investigativa.
- A versão clara preserva a sensação de papel e arquivo; a versão escura usa grafite ameixa e dourado envelhecido.
- Manter grids, linhas finas, margens generosas e textura visual contida. Evitar poluição, excesso de ícones ou aparência de dashboard corporativo genérico.

## Implementação

O tema principal da capa usa `data-paper="oblivio"`. Os temas editoriais das demais áreas são preservados para não descaracterizar as publicações ficcionais existentes.

O Service Worker inclui o emblema no cache central e recebe um novo identificador de cache sempre que os arquivos visuais centrais mudarem.


## Passo 1 — identidade global e capa

Implementado no checkpoint visual de 14/11/2026:

- Cabeçalho global com emblema do Universo Oblívio e identificação de Terra Omega.
- Masthead contextual: a capa usa “Dossiê Central”; as seções de publicação mantêm Farol, VBN, Diário do Cais e Sentinela.
- Metadados do masthead acompanham a publicação ativa, sem reutilizar a edição do Farol em todas as áreas.
- Tipografia do arquivo central padronizada em Cormorant Garamond, Lora e Share Tech Mono.
- Barra de ferramentas e busca com cantos, foco e cores alinhados ao sistema editorial.
- Capa com moldura de arquivo visual, selo legível em telas menores e legenda integrada.
- Rodapé inicial identificado como Arquivo Central.
- Rodapé global atualiza apenas seu texto, preservando o histórico de versões e seus controles.


## Passo 2 — seções internas

Implementado no checkpoint visual seguinte:

- A aba **Universo** mantém a identidade editorial da **Sentinela Dourada** (tipografia, rosa/dourado, masthead e linguagem de publicação), mas compartilha o mesmo papel/fundo do Dossiê Central do Universo Oblívio.
- **Cidade**, **Mapas**, **Transporte** e **Universo** passam a compartilhar o mesmo papel/fundo do Dossiê Central; cada aba preserva sua publicação ficcional: **O Farol de Vanguard**, **VBN**, **O Diário do Cais** e **A Sentinela Dourada**.
- Breadcrumbs e navegação da aba Universo voltam a identificar **A Sentinela Dourada**, enquanto Terra Omega e Universo Oblívio permanecem como identidade global do site.
- Personagens recebem ferramentas, filtros, cards e retratos com acabamento de arquivo.
- Organizações recebem visão geral e cards com hierarquia consistente de facção/instituição.
- Linha do Tempo mantém suas categorias funcionais, mas passa a usar a mesma linguagem de cronologia documental do dossiê central.
- Diário da Campanha recebe toolbar, entradas e indicadores visualmente integrados ao arquivo.
- Sala do Mestre e Conteúdo Mestre usam identidade própria do Universo Oblívio mesmo quando abertos a partir de outra seção do site.
- Editores de personagem, organização e sessão recebem as variáveis visuais do arquivo central sem alterar sua lógica.
- O cache PWA é atualizado para `terra-z-pwa-v1.4.0-20261114-oblivio-ui2`.


## Passo 3 — Grafo e Mapas

Implementado no checkpoint visual seguinte:

- A área **Mapas** preserva a identidade da **VBN**, mas passa a usar moldura cartográfica/broadcasting consistente com o novo fundo global de Terra Omega.
- Os mapas de Vanguard Bay, transporte e referência nacional recebem hierarquia de leitura, identificação operacional, legenda e acabamento responsivo sem alterar os arquivos cartográficos.
- A área de **Criminalidade** permanece como dossiê editorial da VBN e recebe integração visual com a mesma família cartográfica.
- O **Grafo de Relações** preserva toda a lógica existente de zoom, pan, foco, núcleos, arraste local, tela cheia, filtros e edição.
- O grafo passa a funcionar visualmente como uma **rede de inteligência da Sentinela Dourada**, com hierarquia mais clara entre resumo, filtros, viewport, legenda e inspector.
- O viewport normal ganha presença e área útil maiores em desktop sem comprometer o enquadramento mobile/PWA.
- Legenda e controles recebem melhor separação visual; no mobile, a legenda pode ser percorrida horizontalmente sem reduzir a área do mapa.
- Nenhum dado de relações, posição publicada, núcleo ou imagem é alterado por este passo.
