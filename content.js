// Envolvido em uma função para poder ser injetado de novo pelo background
// (abas abertas antes de um reload da extensão) sem redeclarar variáveis.
(() => {
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

  function hideOverlay() {
    document.getElementById("wordframe-overlay")?.remove();
  }

  function showOverlay(result) {
    let box = document.getElementById("wordframe-overlay");
    if (!box) {
      box = document.createElement("div");
      box.id = "wordframe-overlay";
      document.body.appendChild(box);
    }

    // textContent (não innerHTML): o texto selecionado e a resposta da API
    // nunca devem ser interpretados como HTML na página.
    const original = document.createElement("p");
    original.textContent = result.original;

    const translation = document.createElement("p");
    translation.textContent = result.translation;

    box.replaceChildren(original, translation);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideOverlay();
  });

  document.addEventListener("mousedown", (e) => {
    const box = document.getElementById("wordframe-overlay");
    if (box && !box.contains(e.target)) hideOverlay();
  });

  async function handleTranslateSelection() {
    const text = getSelectedText();

    if (!text) {
      showToast("Selecione uma palavra ou frase antes de usar o atalho.");
      return;
    }

    try {
      const result = await chrome.runtime.sendMessage({
        type: "fetch-translation",
        text: text,
      });

      if (!result || result.error) {
        showToast(`Não foi possível traduzir: ${result?.error || "sem resposta."}`);
        return;
      }

      showOverlay(result);
    } catch (error) {
      console.error("Erro ao traduzir:", error);
      showToast("Não foi possível traduzir. Tente recarregar a página.");
    }
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

    if (typeof video.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      showToast("Este navegador não suporta gravar vídeos da página.");
      return;
    }

    try {
      const stream = video.captureStream();
      const options = MediaRecorder.isTypeSupported("video/webm") ? { mimeType: "video/webm" } : undefined;

      recordedChunks = [];
      recorder = new MediaRecorder(stream, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.onstop = onRecordingStop;

      recorder.start();
      showToast("● Gravando... pressione o atalho de novo para parar.", { persistent: true });
    } catch (error) {
      console.error("Erro ao gravar:", error);
      const protectedVideo = error.name === "SecurityError" || error.name === "NotSupportedError";
      showToast(
        protectedVideo
          ? "Este vídeo é protegido e não pode ser gravado."
          : "Não foi possível gravar este vídeo."
      );
    }
  }

  function onRecordingStop() {
    if (recordedChunks.length === 0) {
      showToast("Nada foi gravado. O vídeo estava pausado?");
      return;
    }

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const filename = `wordframe-clip-${Date.now()}.webm`;

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    recordedChunks = [];

    showToast(`Clipe salvo como ${filename}`);
  }

  function showToast(text, { persistent = false } = {}) {
    let toast = document.getElementById("wordframe-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "wordframe-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;

    clearTimeout(toast._hideTimeout);
    if (!persistent) {
      toast._hideTimeout = setTimeout(() => toast.remove(), 4000);
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "translate-selection") {
      handleTranslateSelection();
      sendResponse({ ok: true });
    }

    if (msg.type === "toggle-recording") {
      handleToggleRecording();
      sendResponse({ ok: true });
    }
  });
})();
