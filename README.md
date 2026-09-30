<p align="center">
  <img src="icons/icon-128.png" alt="WordFrame" width="96" height="96">
</p>

<h1 align="center">WordFrame</h1>

<p align="center">
  Extensão para Google Chrome que traduz palavras e frases em inglês direto na página,
  guarda o vocabulário em flashcards e grava trechos de vídeo para estudo.
</p>

---

## Sumário

- [Visão geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Como usar](#como-usar)
- [Arquitetura](#arquitetura)
- [Armazenamento de dados](#armazenamento-de-dados)
- [Permissões e privacidade](#permissões-e-privacidade)
- [Limitações conhecidas](#limitações-conhecidas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Tecnologias](#tecnologias)
- [Licença](#licença)

## Visão geral

O WordFrame foi pensado para quem aprende inglês consumindo conteúdo real: artigos, documentação,
vídeos. Em vez de copiar uma palavra para outra aba, basta selecioná-la e usar um atalho de teclado
para ver a tradução sobre a própria página. As traduções ficam registradas em um histórico e podem
ser salvas como flashcards para revisão posterior.

A extensão é construída sobre o **Manifest V3** e não depende de bibliotecas externas.

## Funcionalidades

**Tradução na página**
Selecione um texto em inglês e pressione `Ctrl+Shift+Y`. A tradução para português aparece em um
painel no canto superior direito, que fecha com `Esc` ou com um clique fora dele.

**Tradução manual no popup**
Digite uma palavra ou frase no popup da extensão e traduza sem sair da aba atual. O resultado pode
ser salvo como flashcard com um clique.

**Flashcards e modo revisão**
As palavras salvas ficam listadas no popup. O modo revisão mostra um cartão por vez: clique no cartão
para alternar entre o termo em inglês e a tradução, e use as setas para navegar.

**Histórico**
As últimas 50 traduções, feitas pelo atalho ou pelo popup, ficam registradas automaticamente.

**Gravação de trechos de vídeo**
Com um vídeo em reprodução na página, pressione `Ctrl+Shift+U` para começar a gravar e novamente
para parar. O trecho é baixado como arquivo `.webm`, útil para rever uma cena ou expressão.

**Interface**
O popup acompanha o tema claro ou escuro do sistema, respeita as preferências de movimento reduzido
e alto contraste, e exibe indicador de foco nos controles para navegação por teclado.

## Instalação

A extensão ainda não está publicada na Chrome Web Store. Para instalá-la a partir do código-fonte:

1. Clone o repositório:
   ```bash
   git clone https://github.com/andynnnfw/wordframe-chrome-extension.git
   ```
2. Abra `chrome://extensions` no Google Chrome.
3. Ative o **Modo do desenvolvedor**, no canto superior direito.
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto clonado.
5. (Opcional) Fixe o ícone na barra de ferramentas pelo menu de extensões.

Páginas que já estavam abertas antes da instalação precisam ser recarregadas para que os atalhos
funcionem nelas.

## Como usar

| Ação | Como fazer |
| --- | --- |
| Traduzir texto selecionado | Selecione o texto e pressione `Ctrl+Shift+Y` |
| Traduzir manualmente | Abra o popup, digite o texto e pressione `Enter` ou **Traduzir** |
| Salvar flashcard | Após traduzir no popup, clique em **Salvar no flashcard** |
| Revisar vocabulário | Aba **Flashcards** > **Revisar** |
| Gravar trecho de vídeo | Pressione `Ctrl+Shift+U` para iniciar e novamente para parar |
| Fechar a tradução na página | `Esc` ou clique fora do painel |

Os atalhos podem ser alterados em `chrome://extensions/shortcuts`.

## Arquitetura

A extensão é dividida em três contextos que se comunicam por mensagens (`chrome.runtime`):

```
 Atalho de teclado
        |
        v
 background.js  (service worker)
   - recebe os comandos e os repassa para a aba ativa
   - consulta a API de tradução
   - grava histórico e flashcards no chrome.storage
        ^                          ^
        | fetch-translation        | fetch-translation / save-vocab
        |                          |
 content.js  (em cada página)    popup.js  (popup da extensão)
   - lê a seleção                  - tradução manual
   - exibe o painel de tradução    - flashcards e revisão
   - grava o vídeo com             - histórico
     captureStream + MediaRecorder
```

**Tradução.** O `background.js` consulta a API pública do [MyMemory](https://mymemory.translated.net/)
com o par `en|pt-BR`. Como o MyMemory é uma memória de tradução colaborativa, a resposta principal
às vezes repete o texto original sem traduzi-lo. Nesses casos, a extensão escolhe a primeira
alternativa válida da lista de correspondências e, se não houver nenhuma, repete a consulta com o
par `en|pt`. Erros de rede, de cota ou respostas inválidas são devolvidos ao chamador e exibidos na
interface.

**Gravação.** O `content.js` localiza o vídeo em reprodução (ou o primeiro `<video>` da página),
captura o fluxo com `HTMLMediaElement.captureStream()` e o grava com `MediaRecorder`. Ao parar, os
dados são reunidos em um `Blob` e baixados pelo navegador.

## Armazenamento de dados

Todos os dados ficam em `chrome.storage.local`, apenas no navegador do usuário.

| Chave | Conteúdo |
| --- | --- |
| `vocabList` | Flashcards salvos: `original`, `translation`, `savedAt` |
| `historyList` | Últimas 50 traduções: `original`, `translation`, `translatedAt` |

## Permissões e privacidade

| Permissão | Motivo |
| --- | --- |
| `storage` | Guardar flashcards e histórico localmente |
| `scripting` e `activeTab` | Reinjetar o script na aba ativa quando ela foi aberta antes da instalação ou de uma atualização da extensão |
| `https://api.mymemory.translated.net/*` | Consultar o serviço de tradução |
| Content script em `<all_urls>` | Ler a seleção e exibir a tradução em qualquer página |

O único dado enviado para fora do navegador é o texto que o usuário escolhe traduzir, encaminhado
à API do MyMemory. A extensão não coleta dados de navegação, não usa servidores próprios e não
possui analytics. Os clipes de vídeo são salvos apenas na pasta de downloads do usuário.

## Limitações conhecidas

- A tradução é feita apenas de inglês para português.
- O MyMemory tem uma cota diária gratuita. Ao atingi-la, a extensão exibe o aviso retornado pela API.
  A qualidade das traduções também varia, principalmente em palavras isoladas.
- Vídeos dentro de `iframe` (por exemplo, vídeos incorporados em outros sites) não são encontrados,
  pois o content script roda apenas no documento principal.
- Vídeos protegidos por DRM (como os de serviços de streaming pagos) não podem ser gravados.
- Os atalhos não funcionam em páginas internas do Chrome (`chrome://`) nem na Chrome Web Store.

## Estrutura do projeto

```
wordframe-chrome-extension/
├── manifest.json     Configuração da extensão (Manifest V3)
├── background.js     Service worker: comandos, tradução e armazenamento
├── content.js        Script injetado nas páginas: painel de tradução e gravação
├── content.css       Estilos do painel de tradução e dos avisos na página
├── popup.html        Estrutura do popup
├── popup.css         Estilos do popup (tema claro e escuro)
├── popup.js          Lógica do popup: tradução, flashcards, revisão e histórico
└── icons/            Logo em SVG e ícones em PNG (16, 32, 48 e 128 px)
```

## Tecnologias

- JavaScript (ES2020+), HTML e CSS, sem frameworks ou etapa de build
- Chrome Extensions API (Manifest V3): `commands`, `runtime`, `storage`, `tabs`
- MediaStream Recording API (`captureStream`, `MediaRecorder`)
- [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php)

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido por [andynnnfw](https://github.com/andynnnfw).
