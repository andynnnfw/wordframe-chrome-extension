const HISTORY_LIMIT = 50;

// Abas abertas antes da instalação (ou de um reload da extensão) ficam sem
// content script ativo. Nesse caso injeta o script e repete a mensagem.
// A permissão activeTab concedida pelo atalho autoriza a injeção.
async function sendToTab(tabId, message) {
    try {
        return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
        if (!String(error?.message).includes("Receiving end does not exist")) throw error;

        await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
        return chrome.tabs.sendMessage(tabId, message);
    }
}

chrome.commands.onCommand.addListener(async (command, tab) => {
    try {
        const target = tab?.id ? tab : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
        if (!target?.id) return;

        await sendToTab(target.id, { type: command });
    } catch (error) {
        // Páginas como chrome:// e a Chrome Web Store não aceitam scripts de extensões.
        console.warn("Aba atual não suporta a extensão.", error);
    }
});

async function queryMyMemory(text, langpair) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
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

    return data;
}

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Alternativas vêm com a caixa de quem as cadastrou ("ATENCIOSOS");
// ajusta para acompanhar o que a pessoa digitou.
function matchCase(source, translation) {
    let result = translation;
    if (result === result.toUpperCase() && source !== source.toUpperCase()) {
        result = result.toLowerCase();
    }
    const startsUpper = source[0] === source[0].toUpperCase() && source[0] !== source[0].toLowerCase();
    return startsUpper
        ? result[0].toUpperCase() + result.slice(1)
        : result[0].toLowerCase() + result.slice(1);
}

// A MyMemory é uma memória colaborativa: às vezes a entrada principal
// é o próprio texto sem tradução ("Thoughtful" -> "Thoughtful").
// Nesse caso, usa a primeira alternativa que realmente traduz.
function pickTranslation(text, data) {
    const main = data.responseData.translatedText;
    if (!sameText(main, text)) return main;

    const alt = (data.matches || []).find(
        (m) => m.translation && m.segment && !sameText(m.translation, m.segment)
    );
    return alt ? matchCase(text, alt.translation) : null;
}

async function fetchTranslation(text) {
    const data = await queryMyMemory(text, "en|pt-BR");
    let translation = pickTranslation(text, data);

    if (!translation) {
        try {
            const fallback = await queryMyMemory(text, "en|pt");
            translation = pickTranslation(text, fallback);
        } catch (error) {
            console.warn("Tentativa com en|pt falhou.", error);
        }
    }

    return {
        original: text,
        translation: translation || data.responseData.translatedText
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
