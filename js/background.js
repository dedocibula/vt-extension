(function($, window, document, undefined) {
	var settings = {
		COURSES_URL: 'https://banweb.banner.vt.edu/ssb/prod/HZSKVTSC.P_ProcRequest',
		TIMETABLE_URL: 'https://banweb.banner.vt.edu/ssb/prod/hzskschd.P_CrseSchdDetl',
		MAIN_URL: chrome.extension.getURL('index.html'),
		LOGIN_URL: 'https://banweb.banner.vt.edu/ssb/prod/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu',
		REFRESH_INTERVAL: 20 * 1000
	};

	var BackgroundWorker = (function() {
		function BackgroundWorker(settings, loader, storage) {
			this.settings = $.extend({}, settings);
			this.loader = loader;
			this.storage = storage;
		}

		BackgroundWorker.prototype = {
			// methods...
		};

		return BackgroundWorker;
	})();

	var Loader = (function() {
		function Loader(settings) {
			this.settings = $.extend({}, settings);
		}

		Loader.prototype = {
			getCoursesAsync: function(onReady, parameters) {
				var self = this, data = {};
				if (!$.isEmptyObject(parameters)) {
					data = $.extend(data, { 
						CORE_CODE: 'AR%', 
						SCHDTYPE: '%', 
						BTN_PRESSED: 'FIND class sections'
					}, parameters);
				}

				$.ajax({
					url: self.settings.COURSES_URL,
					method: $.isEmptyObject(data) ? 'GET' : 'PUT',
					data: data
				}).done(function(results) {
					onReady(self._processResults(results));
				});
			},
			
			_processResults: function(results) {
				var self = this, $results = $(results);
				return self._processMenuSection($results);
			},

			_processMenuSection: function($results) {
				var menu = {
					'CAMPUS': {},
					'TERMYEAR': {},
					'subj_code': {}
				};

				$results.find('select[name="CAMPUS"] option').each(function() {
					if (this.selected) menu['CAMPUS']['selected'] = this.value;
					menu['CAMPUS'][this.value] = this.text;
				});

				$results.find('select[name="TERMYEAR"] option').first().remove().end().each(function() {
					if (!menu['TERMYEAR']['selected']) menu['TERMYEAR']['selected'] = this.value;
					menu['TERMYEAR'][this.value] = this.text;
					menu['subj_code'][this.value] = [];
				});

				menu['subj_code']['default'] = [];
				$results[3].text.split('break').forEach(function(s) {
					for (var prop in menu['subj_code']) {
						if (s.indexOf(prop) != -1) {
							s.split('new Option').forEach(function(a) {
								var match = a.match(/\(\"(.+)\",\"(.+)\"/); 
								if (match && match.length == 3) {
									var obj = {};
									obj[match[2]] = match[1];
									menu['subj_code'][prop].push(obj);
								}
							});
						}
					}
				});

				return menu;
			}
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

	var loader = new Loader(settings);
	loader.getCoursesAsync(function(result) { console.log(result); });

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

