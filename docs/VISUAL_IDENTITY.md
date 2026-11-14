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
