chrome.browserAction.onClicked.addListener(function(tab) {
	var url = chrome.extension.getURL('index.html');
	chrome.tabs.query({ url: url }, function(tabs) {
        if (tabs.length !== 0) {
            chrome.tabs.update(tabs[0].id, { url: url, active: true });
        } else {
            chrome.tabs.create({ url: url });
        }
    });
});