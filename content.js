let recorder = null;
let recordedChunks = [];    

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
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return;
  }
  
  const video = findActiveVideo();
  if (!video) {
    showToast("Nenhum vídeo encontrado nesta página.");
    return;
  }

  try {
    const stream = video.captureStream();
    recordedChunks = [];
    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    recorder.onstop = onRecordingStop;

    recorder.start();
    showToast("Gravando... pressione o atalho de novo para parar.");
  } catch (error) {
    console.error("Erro ao gravar:", error);
    showToast("Não foi possível gravar este vídeo.");
  }
}

function onRecordingStop() {
  const blob = new Blob(recordedChunks, { type: "video/webm" });
  const url = URL.createObjectURL(blob);
  const filename = `wordframe-clip-${Date.now()}.webm`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  showToast(`Clipe salvo como ${filename}`);
}

function showToast(text) {
  let toast = document.getElementById("wordframe-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "wordframe-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = text;


  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => toast.remove(), 4000);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "translate-selection") {
    handleTranslateSelection();
  }

  if (msg.type === "toggle-recording") {
    handleToggleRecording();
  }
});