chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true});

    try {
        await chrome.tabs.sendMessage(tab.id, { type: command});
    } catch (error) {
        console.warn("Aba atual não suporta recebimento de mensagens.", error);
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "fetch-translation") {
        const fetchTranslation = async (text) => {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
            const response = await fetch(url);
            const data = await response.json();

            return{
                original: text,
                translation: data.responseData.translatedText
            };
        };

        fetchTranslation(msg.text).then(sendResponse);
        return true;
    }
});