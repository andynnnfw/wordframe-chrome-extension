const HISTORY_LIMIT = 50;

chrome.commands.onCommand.addListener(async (command) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        await chrome.tabs.sendMessage(tab.id, { type: command });
    } catch (error) {
        console.warn("Aba atual não suporta recebimento de mensagens.", error);
    }
});

async function fetchTranslation(text) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Serviço de tradução respondeu com erro ${response.status}.`);
    }

    const data = await response.json();

    // A MyMemory responde HTTP 200 mesmo em erro (cota esgotada, texto longo);
    // o status real vem em data.responseStatus.
    if (Number(data.responseStatus) !== 200 || !data.responseData?.translatedText) {
        throw new Error(data.responseDetails || "Resposta inválida do serviço de tradução.");
    }

    return {
        original: text,
        translation: data.responseData.translatedText
    };
}

async function addToHistory(result) {
    const { historyList = [] } = await chrome.storage.local.get("historyList");

    historyList.unshift({ ...result, translatedAt: Date.now() });
    await chrome.storage.local.set({ historyList: historyList.slice(0, HISTORY_LIMIT) });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "fetch-translation") {
        const handleTranslation = async () => {
            try {
                const result = await fetchTranslation(msg.text);

                try {
                    await addToHistory(result);
                } catch (error) {
                    console.warn("Não foi possível salvar no histórico.", error);
                }

                sendResponse(result);
            } catch (error) {
                sendResponse({ original: msg.text, error: error.message });
            }
        };

        handleTranslation();
        return true;
    }

    if (msg.type === "save-vocab") {
        const saveVocabItem = async () => {
            try {
                const { vocabList = [] } = await chrome.storage.local.get("vocabList");

                vocabList.unshift(msg.item);
                await chrome.storage.local.set({ vocabList });
                sendResponse({ ok: true });
            } catch (error) {
                sendResponse({ ok: false, error: error.message });
            }
        };

        saveVocabItem();
        return true;
    }
});
