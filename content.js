function handleToggleRecording(){

};

function getSelectedText(){
    return window.getSelection().toString().trim();
}

chrome.runtime.onMessage.addListener((msg) => {
    if(msg.type === "translate-selection"){
        handleTranslateSelection();
    }

    if(msg.type === "toggle-recording"){
        handleToggleRecording();
    }
});

function showOverlay(result){
    let box = document.getElementById("wordframe-overlay");
    if(!box){
        box = document.createElement("div");
        box.id = "wordframe-overlay";
        document.body.appendChild(box);
    }

    box.innerHTML = `
    <p>${result.original}</p>
    <p>${result.translation}</p>`;
}

async function handleTranslateSelection(){
    const text = getSelectedText();

    if(!text){
        alert("Selecione uma palavra ou frase antes de usar o atalho.");
        return;
    }

    const result = await chrome.runtime.sendMessage({
        type: "fetch-translation",
        text: text
    });
    showOverlay(result);
}