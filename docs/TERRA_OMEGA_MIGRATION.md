# Migração técnica — Terra Z → Terra Omega

Status: iniciada em 14/11/2026.

## Objetivo

Migrar a identidade técnica do projeto para **Terra Omega**, preservando compatibilidade durante a transição.

## Sequência segura

1. **Compatibilidade de runtime e arquivos principais**
   - introduzir `terra-omega.css` e `terra-omega.js`;
   - introduzir aliases `TerraOmega*` sem remover imediatamente `TerraZ*`;
   - migrar o prefixo de cache do PWA, mantendo limpeza explícita dos caches antigos.

2. **PWA**
   - substituir o ícone raster 192px legado;
   - padronizar nomes dos assets PWA;
   - validar atualização de instalações existentes;
   - manter o mesmo manifest `id` enquanto o objetivo for atualização in-place.

3. **Referências internas**
   - migrar mensagens de diagnóstico, comentários, schemas não persistentes e documentação;
   - manter temporariamente eventos, localStorage e schemas persistidos quando a troca direta puder perder dados;
   - quando necessário, usar leitura dupla e escrita no nome novo.

4. **GitHub**
   - renomear o repositório `Nierusen34/terra-z` para `Nierusen34/terra-omega`;
   - atualizar workflows, documentação, configuração de publicação e vínculo da Vercel;
   - validar redirects automáticos do GitHub e GitHub Pages.

5. **Vercel**
   - migrar o nome do projeto para Terra Omega;
   - adotar um novo domínio `.vercel.app`;
   - manter o endereço antigo durante uma janela de compatibilidade quando tecnicamente possível;
   - atualizar `apiBase` somente depois de o novo endpoint estar validado.

## Observação de URL

O alias exato `terra-omega.vercel.app` já está ocupado globalmente na Vercel. Será necessário escolher uma variação ou usar um domínio próprio.

## Política de compatibilidade

Durante a migração, nomes técnicos antigos só serão removidos depois de existir substituto validado. Isso inclui namespaces JavaScript, chaves de armazenamento local, eventos e endpoints.
