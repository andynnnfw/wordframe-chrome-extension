function getSelectedText() {
  return window.getSelection().toString().trim();
}

function findActiveVideo() {
  const videos = Array.from(document.querySelectorAll("video"));

  if (videos.length === 0) {
    return null;
  }

  const playing = videos.find((v) => !v.paused && v.readyState > 0);

  return playing || videos[0];
}

function showOverlay(result) {
  let box = document.getElementById("wordframe-overlay");
  if (!box) {
    box = document.createElement("div");
    box.id = "wordframe-overlay";
    document.body.appendChild(box);
  }

  box.innerHTML = `
    <p>${result.original}</p>
    <p>${result.translation}</p>`;
}

async function handleTranslateSelection() {
  const text = getSelectedText();

  if (!text) {
    alert("Selecione uma palavra ou frase antes de usar o atalho.");
    return;
  }

  const result = await chrome.runtime.sendMessage({
    type: "fetch-translation",
    text: text,
  });
  showOverlay(result);
}

function handleToggleRecording() {
  
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "translate-selection") {
    handleTranslateSelection();
  }

  if (msg.type === "toggle-recording") {
    handleToggleRecording();
  }
});