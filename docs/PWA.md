# Terra Omega — PWA

## Objetivo

Terra Omega pode ser instalado como aplicativo mantendo o conteúdo público disponível durante quedas de conexão, sem transformar o cache do navegador em armazenamento de conteúdo Mestre.

## Identidade visual

O PWA usa o emblema do **Universo Oblívio**: uma insígnia ômega/eclipsada em dourado envelhecido sobre fundo grafite ameixa. O ícone substitui a antiga marca neon VB, que era específica de Vanguard Bay e não representava o universo inteiro.

Arquivos:
- `images/pwa/icon-192.webp` — ícone raster para instalação e Apple Touch Icon.
- `images/pwa/icon-512.svg` — ícone vetorial principal.
- `images/pwa/icon-maskable.svg` — versão adaptável com área segura.
- `images/brand/oblivio-emblem.svg` — emblema transparente usado no cabeçalho do dossiê.

A barra superior do aplicativo e a tela inicial usam o mesmo grafite ameixa e dourado envelhecido da identidade global. O nome curto instalado permanece **Terra Omega**, enquanto **Universo Oblívio** identifica a continuidade narrativa.

## Instalação

O manifesto usa caminhos relativos para funcionar tanto na Vercel, na raiz do domínio, quanto no GitHub Pages em `/terra-z/`.

## Estratégia offline

O Service Worker mantém em cache somente o núcleo público necessário para abrir e navegar pelo dossiê. Imagens públicas locais entram no cache conforme são visualizadas, com limite de 80 itens.

Não há pré-cache de toda a biblioteca de imagens, evitando uma instalação inicial de mais de 10 MB.

## Segurança

O Service Worker ignora explicitamente:

- qualquer rota `/api/`;
- requisições com cabeçalho `Authorization`;
- `data/private-*`;
- arquivos `.enc.json`.

Assim, login, cofre Mestre, sessões privadas, publicação, backup e APIs administrativas nunca são salvos no Cache Storage do PWA.

O token do editor continua em `sessionStorage`, fora do Service Worker.

## Atualizações

Uma nova versão não assume o controle silenciosamente durante uma sessão. Quando um Service Worker novo fica aguardando, a interface mostra **Nova versão do Terra Omega disponível**. O usuário decide quando clicar em **Atualizar**.

O identificador do cache deve ser atualizado sempre que o núcleo visual ou os arquivos estáticos centrais mudarem, garantindo que instalações existentes recebam a nova identidade. O checkpoint visual global de 14/11/2026 usa o identificador `terra-z-pwa-v1.4.0-20261114-oblivio-ui1`.

## Offline e administração

Em modo offline, leitura e navegação pelo conteúdo público em cache continuam disponíveis. A interface mostra um indicador Offline e desabilita operações claramente dependentes do servidor, como login, publicação e backup JSON.

## Compatibilidade

- Vercel: escopo `/`.
- GitHub Pages: escopo `/terra-z/`.
- Android/Chromium: instalação via prompt nativo.
- iPhone/iPad: instrução via Compartilhar → Adicionar à Tela de Início.


## Migração Terra Omega — etapa 1

A partir do checkpoint de migração técnica:

- a página principal passa a carregar `terra-omega.css` e `terra-omega.js`;
- `terra-z.css` e `terra-z.js` são mantidos temporariamente no repositório para compatibilidade e rollback;
- o cache principal do PWA passa a usar o prefixo `terra-omega-pwa-`;
- o service worker reconhece e remove caches antigos `terra-z-pwa-` durante a ativação;
- o `id` do manifest permanece estável nesta etapa para que instalações existentes possam receber a atualização em vez de criar um segundo aplicativo;
- o namespace `TerraOmegaApp` começa a existir como alias do runtime legado enquanto os módulos são migrados gradualmente.


## Migração Terra Omega — etapa 2

- o ícone raster 192px passa a usar o emblema atual do Universo Oblívio;
- os assets ativos do manifest passam a se chamar `terra-omega-192.webp`, `terra-omega-512.svg` e `terra-omega-maskable.svg`;
- `terra-omega-compat.js` migra e espelha chaves locais antigas `terraZ_*` para `terraOmega_*`;
- eventos `terra-z:*` e `terra-omega:*` são espelhados durante a janela de compatibilidade;
- o backend público passa a usar `https://terra-omega-rpg.vercel.app`.
