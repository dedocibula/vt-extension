(function($, window, document, undefined) {
	var cachedResults = null;
	var baseUrl = 'https://banweb.banner.vt.edu/ssb/prod/';

	var settings = {
		BASE_URL: baseUrl,
		COURSES_URL: baseUrl + 'HZSKVTSC.P_ProcRequest',
		TIMETABLE_URL: baseUrl + 'hzskschd.P_CrseSchdDetl',
		REFERER_URL: baseUrl + 'hzskstat.P_DispRegStatPage',
		MAIN_URL: chrome.extension.getURL('index.html'),
		LOGIN_URL: baseUrl + 'twbkwbis.P_GenMenu?name=bmenu.P_MainMnu',
		REGISTER_URL: baseUrl + 'bwskfreg.P_AddDropCrse',
		REFRESH_INTERVAL: 20 * 1000
	};

	function registerListeners(settings, backgroundWorker) {
		chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
			headers = details.requestHeaders;

			for (var i = 0; i < headers.length; i++) {
				if (headers[i].name == 'Referer') {
					headers[i].value = settings.REFERER_URL;
					return { requestHeaders: headers };
				}
			}

			headers.push({ name: 'Referer',	value: settings.REFERER_URL });
			return { requestHeaders: headers };
		}, { urls: ["<all_urls>"] }, ['requestHeaders', 'blocking']);

		chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
			if (typeof window[request.action] !== 'function') return;
			request.arguments.push(sendResponse);
			window[request.action].apply(window, request.arguments);
			return true;
		});

		chrome.browserAction.onClicked.addListener(function(tab) {
			backgroundWorker.reloadAll(function(results) {
				var url = results.loggedIn ? settings.MAIN_URL : settings.LOGIN_URL;
				chrome.tabs.query({ url: url }, function(tabs) {
					if (tabs.length !== 0) {
						chrome.tabs.update(tabs[0].id, { url: url, active: true }, function() { cachedResults = results; });
					} else {
						chrome.tabs.create({ url: url }, function() { cachedResults = results; });
					}
				});
			});
		});

		chrome.notifications.onClicked.addListener(function(id) {
			chrome.tabs.create({ url: settings.REGISTER_URL + '?term_in=' + id });
			chrome.notifications.clear(id, function() {});
		});
	}

	function registerPublicApi(window, backgroundWorker) {
		window.updatePreferences = function(preferences, callback) {
			if (!$.isPlainObject(preferences) || !$.isFunction(callback)) return;
			backgroundWorker.updatePreferences(preferences);
			backgroundWorker.reloadAll(callback);
		};

		window.updateWatchedCourses = function(termyear, watchedCourses) {
			if (!$.isPlainObject(watchedCourses)) return;
			backgroundWorker.updateWatchedCourses(termyear, watchedCourses);
		};

		window.getLatestResults = function(callback) {
			if (!$.isFunction(callback)) return;
			if (cachedResults) {
				callback(cachedResults);
				cachedResults = null;
			} else {
				backgroundWorker.reloadAll(callback);
			}
		};

		window.getAddibleCourses = function(callback) {
			if (!$.isFunction(callback)) return;
			backgroundWorker.getAddibleCourses(callback);
		}
	}

	var BackgroundWorker = (function() {
		function BackgroundWorker(settings, loader, storage) {
			this.settings = $.extend({}, settings);
			this.loader = loader;
			this.storage = storage;

			this.timer = null;
			this.preferences = this.storage.retrieve('preferences');
			this.watchedCourses = this.storage.retrieve('watchedCourses');
		}

		BackgroundWorker.prototype = {
			start: function() {
				var self = this;
				if (!self.timer) {
					self.reloadAll(function(results) { self._checkRegistrations(results); });
					self.timer = setInterval(function() {
						if (!$.isEmptyObject(self.watchedCourses[self.preferences.default]))
							self.reloadAll(function(results) { self._checkRegistrations(results); });
					}, self.settings.REFRESH_INTERVAL);
				}
			},

			reloadAll: function(onReady) {
				var self = this;
				var current = self.preferences[self.preferences.default] || {};
				$.when(self.loader.getCoursesAsync(current), 
					self.loader.getTimetableAsync(current.TERMYEAR))
					.done(function(coursesSection, timetableSection) {
						var termyear = timetableSection.default || coursesSection.default, 
							removed = false;
						var watchedSection = $.extend(true, {}, self.watchedCourses[termyear]);
						var preferencesSection = $.extend(true, {}, self.preferences);

						for (var course in watchedSection) {
							if (course in timetableSection.registered)
								removed |= delete watchedSection[course];
						}
						if (removed) self.updateWatchedCourses(termyear, watchedSection);
						delete preferencesSection.default;

						onReady($.extend({}, 
								coursesSection, 
								timetableSection, 
								{ watched: watchedSection },
								{ preferences: preferencesSection }));
					});
			},

			stop: function() {
				var self = this;
				if (self.timer) {
					clearInterval(self.timer);
					self.timer = null;
				}
			},

			updatePreferences: function(preferences) {
				var self = this;
				if ($.isEmptyObject(preferences)) return;
				var termyear = self.preferences['default'] = preferences.TERMYEAR;
				self.preferences[termyear] = $.extend({}, self.preferences[termyear], preferences);
				self.storage.persist('preferences', self.preferences);
			},

			updateWatchedCourses: function(termyear, courses) {
				var self = this;
				self.watchedCourses[termyear] = courses || {};
				self.storage.persist('watchedCourses', self.watchedCourses);
			},

			getAddibleCourses: function(callback) {
				var self = this;
				callback(Object.keys(self.additions || {}));
			},

			_checkRegistrations: function(results) {
				if (!results.loggedIn || $.isEmptyObject(results.watched)) return;
				var self = this, $results = $(results.courses);

				self.additions = {};
				$(results.courses).each(function() {
					if (this.CRN in results.watched && this.Seats > 0)
						self.additions[this.CRN] = {
							title: this.CRN,
							message: this.Title
						};
				});

				if (!$.isEmptyObject(self.additions)) {
					chrome.notifications.create(results.default, {
						type: 'list',
						title: 'VT - Course' + (Object.keys(self.additions).length > 1 ? 's' : '') + ' can be registered',
						message: '',
						items: $.map(self.additions, function(value) { return value; }),
						iconUrl: 'favicon.png'
					}, function(id) {
						setTimeout(function() {
							chrome.notifications.clear(id, function() {});
						}, 10 * 1000);
					});
				}
			}
		};

		return BackgroundWorker;
	})();

	var Loader = (function() {
		function Loader(settings) {
			this.settings = $.extend({}, settings);
		}

		Loader.prototype = {
			getCoursesAsync: function(parameters) {
				var self = this, data = {};
				if (!$.isEmptyObject(parameters)) {
					data = $.extend(data, { 
						CORE_CODE: 'AR%', 
						SCHDTYPE: '%', 
						BTN_PRESSED: 'FIND class sections'
					}, parameters);
				}

				var deferred = $.Deferred();
				$.ajax({
					url: self.settings.COURSES_URL,
					method: $.isEmptyObject(data) ? 'GET' : 'POST',
					type: 'html',
					data: data
				}).done(function(results) {
					deferred.resolve(self._processCoursesSection(results));
				});
				return deferred.promise();
			},

			getTimetableAsync: function(term) {
				var self = this, data = { term_in: term };

				var deferred = $.Deferred();
				$.ajax({
					url: self.settings.TIMETABLE_URL, 
					method: 'GET',
					type: 'html',
					data: data
				}).done(function(results) {
					deferred.resolve(self._processTimetableSection(results.replace(/<img\b[^>]*>/ig, '')));
				});
				return deferred.promise();
			},
			
			_processCoursesSection: function(results) {
				var self = this, $results = $(results);
				var coursesSection = {
					loggedIn: $results.find('a[href$="LogOut"]').length > 0,
					menu: self._processMenuSection($results)
				};
				return coursesSection.loggedIn ? 
					$.extend(coursesSection, 
						{ default: Object.keys(coursesSection.menu.TERMYEAR)[0] }, 
						{ courses: self._processCourses($results) }) : 
					coursesSection;
			},

			_processTimetableSection: function(results) {
				var self = this, $results = $(results);
				var timetable = {
					'registered': {}
				}

				$results.find('a[href$="print_friendly=Y"]').each(function() {
					var match = this.href.match(/term_in=(.+)&/);
					if (match && match.length == 2)
						timetable['default'] = match[1];
				});

				$results.find('table.datadisplaytable tr:gt(1) td:first-child > a').each(function() { 
					timetable['registered'][this.text.trim()] = 'R';
				});

				return timetable;
			},

			_processMenuSection: function($results) {
				var menu = {
					'CAMPUS': {},
					'TERMYEAR': {},
					'subj_code': {}
				};

				$results.find('select[name="CAMPUS"] option').each(function() {
					menu['CAMPUS'][this.value] = this.text;
				});

				$results.find('select[name="TERMYEAR"] option:gt(0)').each(function() {
					menu['TERMYEAR'][this.value] = this.text;
					menu['subj_code'][this.value] = [];
				});

				menu['subj_code']['default'] = [];
				$results[3].text.split('break').forEach(function(s) {
					for (var prop in menu['subj_code']) {
						if (s.indexOf(prop) != -1) {
							s.split('new Option').slice(2).forEach(function(a) {
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
			},

			_processCourses: function($results) {
				var self = this, $coursesRows = $results.find('table.dataentrytable tr');

				var properties = $coursesRows.first().children().map(function() { return this.innerText.split(' ')[0].trim(); });
				var courses = $coursesRows.slice(1).map(function() {
					var course = {};
					var cols = this.children;
					for (var j = 0, i = 0; i < cols.length; i++, j++) {
						try {
							if (cols[i].colSpan > 1)
								j += cols[i].colSpan - 1;
							if (cols[i].innerText.match('(ARR)') || cols[i].innerText === 'TBA')
								continue;
							else if (properties[j] === 'Capacity')
								course[properties[j]] = Number.parseInt(cols[i].innerText);
							else if (properties[j] === 'Seats') {
								var seats = cols[j].innerText.match(/-?\d+/);
								if (seats) course[properties[j]] = Number.parseInt(seats[0]);
							}
							else if (properties[j] === 'CRN') {
								var crn = $(cols[j]).find('a');
								if (crn.length > 0) 
									course['Link'] = self.settings.BASE_URL + crn[0].href.match(/.*\(\"(.+?)\"/)[1];
								course[properties[j]] = cols[i].innerText.trim();
							} else
								course[properties[j]] = cols[i].innerText.trim();
						} catch (e) {
							console.log('Failed to parse: ' + cols[i].innerText);
							console.log(e);
						}
					}
					return course;
				}).filter(function() { return this.CRN; }).toArray();

				return courses;
			},
		};

		return Loader;
	})();

	var Storage = (function() {
		function Storage() {
		}

		Storage.prototype = {
			persist: function(key, value) {
				localStorage.setItem(key, JSON.stringify(value));
			},

			retrieve: function(key) {
				return JSON.parse(localStorage.getItem(key)) || {};
			}
		};

		return Storage;
	})();

	// initialize objects
	var loader = new Loader(settings);
	var worker = new BackgroundWorker(settings, loader, new Storage());
	
	// initialize listeners and api
	registerListeners(settings, worker);
	registerPublicApi(window, worker);

	// start worker
	worker.start();

	// for testing purposes
	// worker.reloadAll(function(results) {
	// 	console.log(results);
	// });
})(jQuery, window, document);

