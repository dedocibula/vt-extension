(function($, window, document, undefined) {
	var BackgroundWorker = (function() {
		function BackgroundWorker(loader, storage) {
			this.loader = loader;
			this.storage = storage;
		}

		BackgroundWorker.prototype = {
			// methods...
		};

		return BackgroundWorker;
	})();

	var Loader = (function() {
		function Loader(options) {
			this.options = $.extend({}, options);
		}

		Loader.prototype = {
			// methods...
		};

		return Loader;
	})();

	var Storage = (function() {
		function Storage() {
		}

		Storage.prototype = {
			// methods...
		};

		return Storage;
	})();

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
})(jQuery, window, document);

