const helpBtn = document.getElementById("help-shortcuts-btn");
const shortcutsPanel = document.getElementById("shortcuts-panel");
const closeShortcutsBtn = document.getElementById("close-shortcuts-btn");


helpBtn.addEventListener("click", () => {
    shortcutsPanel.classList.toggle("hidden");
});

closeShortcutsBtn.addEventListener("click", () => {
    shortcutsPanel.classList.add("hidden");
});


const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const emptyHistoryHTML = historyList.innerHTML;

async function loadHistory() {
    const {historyList: items = []} = await chrome.storage.local.get("historyList");

    clearHistoryBtn.disabled = items.length === 0;

    if (items.length === 0) {
        historyList.innerHTML = emptyHistoryHTML;
        return;
    }

    historyList.innerHTML = items
    .map(
      (item) => `
      <div class="flashcard-row">
        <div class="fc-text">
          <strong>${escapeHtml(item.original)}</strong>
          ${escapeHtml(item.translation || "")}
        </div>
      </div>`
    )
    .join("");
}

clearHistoryBtn.addEventListener("click", async () => {
    if (!confirm("Apagar todo o histórico de traduções?")) return;
    await chrome.storage.local.set({historyList: []});
    loadHistory();
});


const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "flashcards") loadFlashcards();
    if (btn.dataset.tab === "history") loadHistory();
  });
});


const manualInput = document.getElementById("manual-input");
const manualBtn = document.getElementById("manual-translate-btn");
const manualResult = document.getElementById("manual-result");

manualBtn.addEventListener("click", doManualTranslate);
manualInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doManualTranslate();
});

async function doManualTranslate() {
  const text = manualInput.value.trim();
  if (!text) return;
  manualResult.innerHTML = `<p>Traduzindo…</p>`;

  let result;
  try {
    result = await chrome.runtime.sendMessage({ type: "fetch-translation", text });
  } catch (error) {
    result = { error: error.message };
  }

  if (!result || result.error) {
    manualResult.innerHTML = `<p>Não foi possível traduzir: ${escapeHtml(result?.error || "sem resposta.")}</p>`;
    return;
  }

  manualResult.innerHTML = `
    <p class="r-translation">${escapeHtml(result.translation)}</p>
    ${result.imageUrl ? `<img src="${escapeHtml(result.imageUrl)}" alt="contexto">` : ""}
    <button id="manual-save-btn">salvar no flashcard</button>
  `;
  const saveBtn = document.getElementById("manual-save-btn");
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    const response = await chrome.runtime.sendMessage({type: "save-vocab", item: {
        original: result.original,
        translation: result.translation,
        imageUrl: result.imageUrl,
        savedAt: Date.now(),
        clipFile: null,
      },
    });

    if (response?.ok) {
      saveBtn.textContent = "salvo no flashcard";
      loadFlashcards();
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = "erro ao salvar — tentar de novo";
    }
  });
}


const flashcardList = document.getElementById("flashcard-list");
const flashcardCount = document.getElementById("flashcard-count");
let vocabCache = [];

async function loadFlashcards() {
  const { vocabList = [] } = await chrome.storage.local.get("vocabList");
  vocabCache = vocabList;
  const n = vocabList.length;
  flashcardCount.textContent = `${n} ${n === 1 ? "palavra salva" : "palavras salvas"}`;
  reviewBtn.disabled = n === 0;
  flashcardList.innerHTML = vocabList
    .map(
      (item, i) => `
      <div class="flashcard-row" data-index="${i}">
        <div class="fc-text">
          <strong>${escapeHtml(item.original)}</strong>
          ${escapeHtml(item.translation || "")}
          ${item.clipFile ? " 🎬" : ""}
        </div>
        <button class="fc-delete" data-index="${i}">excluir</button>
      </div>`
    )
    .join("");

  flashcardList.querySelectorAll(".fc-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      vocabCache.splice(idx, 1);
      await chrome.storage.local.set({ vocabList: vocabCache });
      await loadFlashcards();
      syncReviewAfterDelete();
    });
  });
}


const reviewBtn = document.getElementById("review-btn");
const reviewArea = document.getElementById("review-area");
const reviewCard = document.getElementById("review-card");
const reviewProgress = document.getElementById("review-progress");
const reviewClose = document.getElementById("review-close");

let reviewIndex = 0;
let showingAnswer = false;

loadFlashcards();

reviewBtn.addEventListener("click", () => {
  if (vocabCache.length === 0) return;
  reviewIndex = 0;
  showingAnswer = false;
  reviewArea.classList.remove("hidden");
  renderReviewCard();
});

reviewClose.addEventListener("click", () => reviewArea.classList.add("hidden"));

document.getElementById("review-prev").addEventListener("click", () => {
  if (vocabCache.length === 0) return;
  reviewIndex = (reviewIndex - 1 + vocabCache.length) % vocabCache.length;
  showingAnswer = false;
  renderReviewCard();
});

document.getElementById("review-next").addEventListener("click", () => {
  if (vocabCache.length === 0) return;
  reviewIndex = (reviewIndex + 1) % vocabCache.length;
  showingAnswer = false;
  renderReviewCard();
});

reviewCard.addEventListener("click", () => {
  showingAnswer = !showingAnswer;
  renderReviewCard();
});

function syncReviewAfterDelete() {
  if (reviewArea.classList.contains("hidden")) return;
  if (vocabCache.length === 0) {
    reviewArea.classList.add("hidden");
    return;
  }
  reviewIndex = Math.min(reviewIndex, vocabCache.length - 1);
  showingAnswer = false;
  renderReviewCard();
}

function renderReviewCard() {
  const item = vocabCache[reviewIndex];
  if (!item) return;
  reviewProgress.textContent = `${reviewIndex + 1} / ${vocabCache.length}`;
  if (!showingAnswer) {
    reviewCard.innerHTML = `<strong>${escapeHtml(item.original)}</strong><span>(toque para ver a tradução)</span>`;
  } else {
    reviewCard.innerHTML = `
      <strong>${escapeHtml(item.translation || "?")}</strong>
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="contexto">` : ""}
      ${item.clipFile ? `<span>clipe: ${escapeHtml(item.clipFile)}</span>` : ""}
    `;
  }
}

// Escapa também aspas, porque o resultado é usado dentro de atributos (src="…").
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
