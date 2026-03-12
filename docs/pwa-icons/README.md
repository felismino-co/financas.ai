# Icons do PWA — FinanceIA

Este diretório é um guia para gerar os ícones reais do PWA do FinanceIA.

Atualmente o projeto referencia dois arquivos:

- `public/icons/icon-192x192.png`
- `public/icons/icon-512x512.png`

Eles são usados no `manifest.json`, no plugin `vite-plugin-pwa` e nas meta tags de PWA.

## Como gerar os ícones

Você pode usar Figma, Sketch, Photoshop ou qualquer editor de imagens. A ideia é criar um ícone simples usando o emoji 💰 como base.

### Passo a passo sugerido (Figma)

1. Crie um novo frame quadrado com **512x512 px**.
2. Defina o fundo com a cor do app:
   - Fundo: `#0F0F1A`
3. Adicione o emoji **💰** no centro:
   - Fonte: Apple Color Emoji / Noto Color Emoji (ou equivalente)
   - Tamanho grande (por volta de 320–380px) para preencher bem o espaço.
4. Centralize o emoji no frame (horizontal e vertical).
5. Exporte em PNG:
   - `icon-512x512.png` com 1x (512x512).
6. Redimensione para 192x192:
   - Crie um frame 192x192.
   - Reaproveite o mesmo design, ajustando o tamanho do emoji.
   - Exporte como `icon-192x192.png`.

> Dica: se preferir, use um serviço online como [https://realfavicongenerator.net](https://realfavicongenerator.net) para gerar automaticamente as variações a partir de um SVG/PNG principal.

## Onde colocar os arquivos

1. Crie a pasta `public/icons` se ainda não existir.
2. Coloque os arquivos:
   - `public/icons/icon-192x192.png`
   - `public/icons/icon-512x512.png`

O `vite-plugin-pwa` e o `manifest.json` já estão configurados para usar esses caminhos.

## Testando o PWA

1. Rode o projeto em modo produção:
   ```bash
   npm run build
   npm run preview
   ```
2. Abra no navegador (Chrome/Edge) e verifique:
   - Mensagem de instalação (via banner `InstallPWA` quando suportado).
   - Menu do navegador → “Instalar FinanceIA” ou “Adicionar à tela inicial”.
3. No celular:
   - Acesse a URL pelo navegador.
   - Procure a opção “Adicionar à Tela Inicial”.
   - Ao abrir o app instalado, ele deve estar em modo **standalone**, sem barra de endereço.

