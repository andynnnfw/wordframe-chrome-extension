function handleTranslateSelection(){

};

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