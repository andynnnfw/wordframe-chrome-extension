# WordFrame 2.0: tradução ao selecionar

## Objetivo

Hoje a tradução na página depende do atalho `Ctrl+Shift+Y` e o resultado aparece fixo no canto
superior direito. Na 2.0, basta selecionar um texto em qualquer site para a tradução aparecer em um
pop-up logo ao lado da seleção, sem precisar de atalho.

## O que já existe e será reaproveitado

- `content.js` já lê a seleção (`getSelectedText`) e já monta o painel com `textContent`, sem risco
  de injetar HTML na página.
- `background.js` já faz a consulta ao MyMemory (`fetch-translation`), trata as respostas ruins da
  API e grava o histórico.
- A mensagem `save-vocab` já salva flashcards e pode ser usada direto no pop-up.
- O atalho `Ctrl+Shift+Y` continua funcionando como alternativa.

## Passo a passo

1. **Detectar a seleção** (`content.js`)
   Ouvir `mouseup` e `keyup` (seleção feita com `Shift` + setas) e ler `window.getSelection()`.
   Ignorar seleções vazias, muito longas (o MyMemory aceita até 500 bytes por consulta) e cliques
   dentro do próprio pop-up.

2. **Calcular a posição** (`content.js`)
   Usar `selection.getRangeAt(0).getBoundingClientRect()` para saber onde está o texto e posicionar
   o pop-up logo abaixo (ou acima, se não couber na tela), sem sair da área visível.

3. **Mostrar um botão antes de traduzir** (`content.js`, `content.css`)
   Ao selecionar, aparece um ícone pequeno do WordFrame perto da seleção; o clique nele traduz.
   Traduzir automaticamente a cada seleção gastaria a cota diária gratuita do MyMemory muito rápido,
   porque toda seleção acidental viraria uma consulta. O modo automático fica como opção (passo 6).

4. **Pop-up ancorado na seleção** (`content.js`, `content.css`)
   Trocar o `#wordframe-overlay` fixo no canto por um pop-up posicionado ao lado do texto, com
   estado de "Traduzindo…", erro e resultado. Fechar com `Esc`, clique fora ou rolagem da página.
   Montar o pop-up dentro de um Shadow DOM, para que o CSS dos sites não quebre o visual
   (hoje só o `all: initial` protege, e não cobre os filhos).

5. **Botão "salvar no flashcard" no pop-up**
   Reaproveitar a mensagem `save-vocab` que o popup da extensão já usa.

6. **Configurações no popup da extensão** (`popup.html`, `popup.js`)
   Opções salvas em `chrome.storage.sync` e lidas pelo `content.js`:
   - ligar/desligar a tradução ao selecionar;
   - modo: botão (padrão) ou automático;
   - lista de sites onde a extensão fica desligada (opcional).

7. **Funcionar dentro de iframes** (`manifest.json`)
   Adicionar `"all_frames": true` ao content script, para pegar textos em conteúdo incorporado.

8. **Testar nos casos difíceis**
   Sites comuns, campos de texto (`input` e `textarea`), páginas com CSS agressivo, páginas abertas
   antes de recarregar a extensão e seleções que atravessam vários parágrafos.

9. **Fechar a versão**
   Mudar `version` no `manifest.json` para `2.0.0`, atualizar o README (funcionalidades, tabela
   "Como usar", limitações) e registrar as mudanças no `CHANGELOG.md`.

## Limitações a ter em mente

- **Google Docs** desenha o texto em canvas, então a seleção não é lida por `getSelection()` e o
  pop-up não vai funcionar lá. Na pesquisa do Google e nos sites comuns funciona normalmente.
- **PDFs** abertos no visualizador do Chrome e páginas `chrome://` não aceitam content scripts.
- **MyMemory**: cota diária gratuita e limite de 500 bytes por consulta. Se isso apertar, dá para
  trocar de serviço depois (DeepL, Google Cloud Translation ou uma IA), mas esses pedem chave de API.

## Decisões em aberto

- Serviço de tradução: manter o MyMemory (gratuito, sem chave) ou trocar.
- Idiomas: continuar só inglês → português ou detectar o idioma de origem automaticamente.
