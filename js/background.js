(function($, window, document, undefined) {
	var settings = {
		COURSES_URL: 'https://banweb.banner.vt.edu/ssb/prod/HZSKVTSC.P_ProcRequest',
		TIMETABLE_URL: 'https://banweb.banner.vt.edu/ssb/prod/hzskschd.P_CrseSchdDetl',
		REFERER_URL: 'https://banweb.banner.vt.edu/ssb/prod/hzskstat.P_DispRegStatPage',
		MAIN_URL: chrome.extension.getURL('index.html'),
		LOGIN_URL: 'https://banweb.banner.vt.edu/ssb/prod/twbkwbis.P_GenMenu?name=bmenu.P_MainMnu',
		REFRESH_INTERVAL: 20 * 1000
	};

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

	var BackgroundWorker = (function() {
		function BackgroundWorker(settings, loader, storage) {
			this.settings = $.extend({}, settings);
			this.loader = loader;
			this.storage = storage;

			this.timer = null;
			this.preferences = this.storage.retrieve('preferences');
			this.watchedCourses = this.storage.retrieve('watchedCourses')
		}

		BackgroundWorker.prototype = {
			start: function() {
				var self = this;
				if (!self.timer) {
					self.reloadAll(function(results) { self._checkRegistrations(results); });
					self.timer = setInterval(function() {
						if (!$.isEmptyObject(self.watchedCourses))
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
						var termyear = timetableSection.default || coursesSection.default, removed = false;
						var watchedSection = self.watchedCourses[termyear] || {};
						for (var course in watchedSection) {
							if (course in timetableSection.registered)
								removed |= delete watchedSection[course];
						}
						if (removed) self.updateWatchedCourses(termyear, watchedSection);
						onReady($.extend({}, coursesSection, timetableSection, { watched: watchedSection }));
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

			_checkRegistrations: function(results) {
				if (!results.loggedIn || $.isEmptyObject(results.watched)) return;
				var self = this, $results = $(results.courses);

				$(results.courses).each(function() {
					for (var course in results.watched) {
						if (this.CRN == course && this.Seats > 0) {
							chrome.notifications.create(course, {
								type: 'basic',
					          	title: 'VT - Course Notification',
					          	message: this.title + ' can be registered',
					          	iconUrl: 'favicon.png'
							}, function(id) {
								setTimeout(function() {
									chrome.notifications.clear(id, function() {});
								}, 10 * 1000);
							});
							break;
						}
					}
				});
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
					if (this.selected) menu['CAMPUS']['selected'] = this.value;
					menu['CAMPUS'][this.value] = this.text;
				});

				$results.find('select[name="TERMYEAR"] option').first().remove().end().each(function() {
					menu['TERMYEAR'][this.value] = this.text;
					menu['subj_code'][this.value] = [];
				});

				menu['subj_code']['default'] = [];
				$results[3].text.split('break').forEach(function(s) {
					for (var prop in menu['subj_code']) {
						if (s.indexOf(prop) != -1) {
							s.split('new Option').slice(1).forEach(function(a) {
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
				$coursesRows = $results.find('table.dataentrytable tr');

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
								if (crn.length > 1) course['Link'] = crn[0].href;
								course[properties[j]] = cols[i].innerText.trim();
							} else
								course[properties[j]] = cols[i].innerText.trim();
						} catch (e) {
							console.log('Failed to parse: ' + cols[i].innerText);
							console.log(e);
						}
					}
					return course;
				});

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

	var loader = new Loader(settings);
	var worker = new BackgroundWorker(settings, loader, new Storage());
	worker.start();

	chrome.browserAction.onClicked.addListener(function(tab) {
		worker.reloadAll(function(results) {
			var url = results.loggedIn ? settings.MAIN_URL : settings.LOGIN_URL;
			chrome.tabs.query({ url: url }, function(tabs) {
				if (tabs.length !== 0) {
					chrome.tabs.update(tabs[0].id, { url: url, active: true });
				} else {
					chrome.tabs.create({ url: url });
				}
			});
		});
	});

	worker.reloadAll(function(results) {
		console.log(results);
	});
})(jQuery, window, document);

