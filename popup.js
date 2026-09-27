const helpBtn = document.getElementById("help-shortcuts-btn");
const shortcutsPanel = document.getElementById("shortcuts-panel");
const closeShortcutsBtn = document.getElementById("close-shortcuts-btn");


helpBtn.addEventListener("click", () => {
    shortcutsPanel.classList.toggle("hidden");
});

closeShortcutsBtn.addEventListener("click", () => {
    shortcutsPanel.classList.toggle("hidden");
});


const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");
const emptyHistoryHTML = historyList.innerHTML;

async function loadHistory() {
    const {historyList: items = []} = await chrome.storage.local.get("historyList");

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
    await chrome.storage.local.set({historyList: []});
    loadHistory();
});


const tabButtons = document.getElementById(".tab-btn");
const tabPanels = document.getElementById(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
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
  const result = await chrome.runtime.sendMessage({ type: "fetch-translation", text });
  manualResult.innerHTML = `
    <p class="r-translation">${escapeHtml(result.translation || "(indisponível)")}</p>
    ${result.imageUrl ? `<img src="${result.imageUrl}" alt="contexto">` : ""}
    <button id="manual-save-btn">💾 salvar no flashcard</button>
  `;
  document.getElementById("manual-save-btn")?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({type: "save-vocab", item: {
        original: result.original,
        translation: result.translation,
        imageUrl: result.imageUrl,
        savedAt: Date.now(),
        clipFile: null,
      },
    });
    loadFlashcards();
  });
}


const flashcardList = document.getElementById("flashcard-list");
const flashcardCount = document.getElementById("flashcard-count");
let vocabCache = [];

async function loadFlashcards() {
  const { vocabList = [] } = await chrome.storage.local.get("vocabList");
  vocabCache = vocabList;
  flashcardCount.textContent = `${vocabList.length} palavra(s) salva(s)`;
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
      const idx = Number(e.target.dataset.index);
      vocabCache.splice(idx, 1);
      await chrome.storage.local.set({ vocabList: vocabCache });
      loadFlashcards();
    });
  });
}

loadFlashcards();


const reviewBtn = document.getElementById("review-btn");
const reviewArea = document.getElementById("review-area");
const reviewCard = document.getElementById("review-card");
const reviewProgress = document.getElementById("review-progress");
const reviewClose = document.getElementById("review-close");

let reviewIndex = 0;
let showingAnswer = false;

reviewBtn.addEventListener("click", () => {
  if (vocabCache.length === 0) return;
  reviewIndex = 0;
  showingAnswer = false;
  reviewArea.classList.remove("hidden");
  renderReviewCard();
});

reviewClose.addEventListener("click", () => reviewArea.classList.add("hidden"));

document.getElementById("review-prev").addEventListener("click", () => {
  reviewIndex = (reviewIndex - 1 + vocabCache.length) % vocabCache.length;
  showingAnswer = false;
  renderReviewCard();
});

document.getElementById("review-next").addEventListener("click", () => {
  reviewIndex = (reviewIndex + 1) % vocabCache.length;
  showingAnswer = false;
  renderReviewCard();
});

reviewCard.addEventListener("click", () => {
  showingAnswer = !showingAnswer;
  renderReviewCard();
});

function renderReviewCard() {
  const item = vocabCache[reviewIndex];
  if (!item) return;
  reviewProgress.textContent = `${reviewIndex + 1} / ${vocabCache.length}`;
  if (!showingAnswer) {
    reviewCard.innerHTML = `<strong>${escapeHtml(item.original)}</strong><span>(toque para ver a tradução)</span>`;
  } else {
    reviewCard.innerHTML = `
      <strong>${escapeHtml(item.translation || "?")}</strong>
      ${item.imageUrl ? `<img src="${item.imageUrl}" alt="contexto">` : ""}
      ${item.clipFile ? `<span>clipe: ${escapeHtml(item.clipFile)}</span>` : ""}
    `;
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}