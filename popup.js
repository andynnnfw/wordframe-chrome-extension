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

  