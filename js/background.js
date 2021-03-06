(function($, window, document, undefined) {
	var cachedResults = null;
	var loginRedirect = false;
	var baseUrl = 'https://banweb.banner.vt.edu/ssb/prod/';

	var settings = {
		BASE_URL: baseUrl,
		COURSES_URL: baseUrl + 'HZSKVTSC.P_ProcRequest',
		TIMETABLE_URL: baseUrl + 'hzskschd.P_CrseSchdDetl',
		REFERER_URL: baseUrl + 'hzskstat.P_DispRegStatPage',
		MAIN_URL: chrome.extension.getURL('index.html'),
		LOGIN_URL: baseUrl + 'twbkwbis.P_GenMenu?name=bmenu.P_MainMnu',
		REGISTER_URL: baseUrl + 'bwskfreg.P_AddDropCrse',
		REQUEST_DATES_URL: 'http://registrar.vt.edu/dates-deadlines-accordion/Drop-Add.html',
		REFRESH_INTERVAL: 20 * 1000,
		DATES_CHECK_TIME: new Date(0, 0, 0, 0, 5, 0, 0),

		ONLINE_ICON: 'favicon.png',
		OFFLINE_ICON: 'favicon-offline.png',
		BADGE_COLOR: [232, 76, 61, 255],
		SOUND: 'chime.ogg'
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
				loginRedirect = !results.loggedIn;
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
			if (id !== 'important-dates') chrome.tabs.create({ url: settings.REGISTER_URL + '?term_in=' + id });
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

		window.dropCourse = function(termyear, course) {
			if (!course) return;
			backgroundWorker.dropCourse(termyear, course);
		};

		window.getCourseChanges = function(callback) {
			if (!$.isFunction(callback)) return;
			backgroundWorker.getCourseChanges(callback);
		};

		window.shouldRedirect = function(callback) {
			if (!$.isFunction(callback)) return;
			if (loginRedirect) {
				callback({ redirect: settings.MAIN_URL });
				cachedResults = null;
				loginRedirect = false;
			} else {
				callback({ redirect: null });
			}
		}
	}

	var BackgroundWorker = (function() {
		function BackgroundWorker(settings, loader, storage) {
			this.settings = $.extend({}, settings);
			this.loader = loader;
			this.storage = storage;

			this.timer = null;
			this.reloading = false;
			this.online = false;
			this.badgeText = '';
			this.sound = null;
			this.timeout = null;
			this.importantDates = null;
			this.lastChecked = null;

			this.additions = {};
			this.removals = [];

			this.preferences = this.storage.retrieve('preferences');
			this.watchedCourses = this.storage.retrieve('watchedCourses');
		}

		BackgroundWorker.prototype = {
			start: function() {
				var self = this;
				if (!self.timer) {
					self.reloadAll(function(results) { self._checkRegistrations(results); });
					self.timer = setInterval(function() {
						if ((!$.isEmptyObject(self.watchedCourses[self.preferences.default]) &&
							!self.reloading) || !self.online) {
							self.reloading = true;
							self.reloadAll(function(results) { self._checkRegistrations(results); });
						}
					}, self.settings.REFRESH_INTERVAL);
				}
			},

			reloadAll: function(onReady) {
				var self = this;
				var current = self.preferences[self.preferences.default] || {};
				$.when(self.loader.getCoursesAsync(current), 
					self.loader.getTimetableAsync(current.TERMYEAR))
					.done(function(coursesSection, timetableSection) {
						self.reloading = false;

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

						self._checkImportantDates(coursesSection.menu.TERMYEAR, function(importantDates) {
							onReady($.extend({}, 
								coursesSection, 
								timetableSection, 
								{ watched: watchedSection },
								{ preferences: preferencesSection },
								{ importantDates: importantDates }));
						});

						self._setOnline(true);
					})
					.fail(function(status) {
						self._setOnline(false);
						self.lastChecked = null;				
					});
			},

			stop: function() {
				var self = this;
				if (self.timer) {
					clearInterval(self.timer);
					self.timer = null;
				}
				if (self.timeout) {
					clearTimeout(self.timeout);
					self.timeout = null;
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
				for (var crn in self.additions)
					if (!(crn in courses))
						delete self.additions[crn];
				self.storage.persist('watchedCourses', self.watchedCourses);
			},

			dropCourse: function(termyear, course) {
				var self = this;
				self.removals.push(course);
				chrome.tabs.create({ url: self.settings.REGISTER_URL + '?term_in=' + termyear });
			},

			getCourseChanges: function(callback) {
				var self = this;
				callback({
					additions: Object.keys(self.additions),
					removals: self.removals
				});
				self.additions = {};
				self.removals = [];
			},

			_checkRegistrations: function(results) {
				if (!results.loggedIn || 
					$.isEmptyObject(results.watched) ||
					!results.importantDates.courseAdds[results.default].available) return;
				var self = this, $results = $(results.courses);

				self.additions = {};
				$(results.courses).each(function() {
					if (this.CRN in results.watched && this.Seats > 0)
						self.additions[this.CRN] = { title: this.CRN, message: this.Title };
				});

				if (!$.isEmptyObject(self.additions)) {
					chrome.notifications.create(results.default, {
						type: 'list',
						title: 'VT - Course' + (Object.keys(self.additions).length > 1 ? 's' : '') + ' can be registered',
						message: '',
						items: $.map(self.additions, function(value) { return value; }),
						iconUrl: self.settings.ONLINE_ICON
					}, function(id) {
						setTimeout(function() {
							chrome.notifications.clear(id, function() {});
						}, 10 * 1000);
					});

					self._playSound();
				}
			},

			_checkImportantDates: function(terms, callback) {
				var self = this, currentDate = new Date();
				currentDate.setHours(0, 0, 0, 0);
				currentDate = currentDate.getTime();

				if (self.lastChecked === currentDate && self.importantDates) {
					callback(self.importantDates);
				} else {
					if (self.timeout) clearTimeout(self.timeout);

					self.loader.getRequestDatesAsync(terms)
						.done(function(requestDates) {
							self.lastChecked = currentDate;
							self.importantDates = self._checkAvailability(requestDates, currentDate, terms);
							self.timeout = setTimeout(function() { self.reloadAll(function() { }); }, self._nextOccurrence());
							callback(self.importantDates);
						});
				}
			},

			_checkAvailability: function(results, currentDate, termLabels) {
				var self = this, items = [];

				for (var prop in results) {
					var requestType = prop.replace(/([A-Z])/g, ' $1').toLowerCase();
					for (var term in results[prop]) {
						var overlap = self._checkOverlap(requestType, termLabels[term], results[prop][term], currentDate);
						results[prop][term].available = overlap.available;
						if (overlap.message) items.push({ title: overlap.message, message: '' });
					}
				}

				if (!$.isEmptyObject(items)) {
					chrome.notifications.create('important-dates', {
						type: 'list',
						title: 'VT - Important Dates',
						message: '',
						items: items,
						iconUrl: 'favicon.png'
					}, function(id) {
						setTimeout(function() {
							chrome.notifications.clear(id, function() {});
						}, 10 * 1000);
					});

					self._playSound();
					self._setBadge('!');
				} else {
					self._setBadge('');
				}

				return results;
			},

			_checkOverlap: function(requestType, termLabel, interval, currentDate) {
				var available = currentDate >= interval.start && currentDate <= interval.end,
					message = null;

				if (available) {
					if (currentDate === interval.start) message = 'Today, ' + requestType + ' for ' + termLabel + ' begin';
					if (currentDate === interval.end) message = 'Today is the last day for ' + requestType + ' for ' + termLabel;
				} else {
					var tomorrow = new Date(currentDate);
					tomorrow.setDate(tomorrow.getDate() + 1);
					if (tomorrow.getTime() === interval.start) message = 'Tomorrow, ' + requestType + ' for ' + termLabel + ' become available';
				}
				
				return { available: available, message: message };
			},

			_nextOccurrence: function() {
				var self = this, nextOccurrence = new Date();
				nextOccurrence.setDate(nextOccurrence.getDate() + 1);
				nextOccurrence.setHours(self.settings.DATES_CHECK_TIME.getHours(), self.settings.DATES_CHECK_TIME.getMinutes(),
										self.settings.DATES_CHECK_TIME.getSeconds(), self.settings.DATES_CHECK_TIME.getMilliseconds());
				return nextOccurrence.getTime() - Date.now();
			},

			_setOnline: function(online) {
				var self = this;
				if (self.online != online)
					chrome.browserAction.setIcon({ path: (online ? self.settings.ONLINE_ICON : self.settings.OFFLINE_ICON) });
				self.online = online;
			},

			_setBadge: function(badgeText) {
				var self = this;
				if (self.badgeText !== badgeText) {
					chrome.browserAction.setBadgeBackgroundColor({ color: self.settings.BADGE_COLOR });
					chrome.browserAction.setBadgeText({ text: badgeText });
				}
				self.badgeText = badgeText;
			},

			_playSound: function() {
				var self = this;
				if (!self.sound)
					self.sound = new Audio(self.settings.SOUND);
				self.sound.play();
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
				}).fail(function(ignore, status) {
					deferred.reject(status);
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
					deferred.resolve(self._processTimetableSection(results.replace(/<img\b[^>]*>/ig, ''), term));
				}).fail(function(ignore, status) {
					deferred.reject(status);
				});
				return deferred.promise();
			},

			getRequestDatesAsync: function(terms) {
				var self = this;

				var deferred = $.Deferred();
				$.ajax({
					url: self.settings.REQUEST_DATES_URL,
					method: 'GET',
					type: 'html'
				}).done(function(results) {
					var results = results.replace(/<img\b[^>]*>/ig, '');

					var courseRequests = self._processCourseRequests(results, terms);

					var patterns = {};
					for (var term in terms) {
						var parts = terms[term].split(' ');
						patterns[term] = { term: parts[0], year: parts[parts.length - 1] };
					}

					var dropAddRequests = self._processDropAdds(results, patterns);

					deferred.resolve($.extend({ courseRequests: courseRequests }, dropAddRequests));
				}).fail(function(ignore, status) {
					deferred.reject(status);
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

			_processTimetableSection: function(results, term) {
				var self = this, $results = $(results);
				var timetable = {
					'registered': {}
				}

				if (term && results.match(new RegExp(term.substring(0, 4)))) timetable['default'] = term;

				$results.find('table.datadisplaytable tr:gt(1) td:first-child > a').each(function() { 
					timetable['registered'][this.text.trim()] = 'R';
				});

				return timetable;
			},

			_processCourseRequests: function(results, terms) {
				var self = this, courseRequests = {},
					$items = $(results).find('h3:contains("Course Request Availability")').next('ul').children();

				for (var term in terms) {
					var termParts = terms[term].split(' ');
					for (var i = 0; i < $items.length; i++) {
						var parts = $items[i].innerText.split(':');
						if (parts[0].match(termParts[0] + ' ' + termParts[termParts.length - 1])) {
							var match = parts[1].trim().match(/(.+) (\d+)-(\d+), (\d+)/);
							if (match && match.length == 5)
								parts[1] = match[1] + ' ' + match[2] + ', ' + match[4] + ' - ' + match[1] + ' ' + match[3] + ', ' + match[4];

							var limits = parts[1].split(' - ');
							courseRequests[term] = {
								start: Date.parse(limits[0].trim()),
								end: Date.parse(limits[1].trim())
							}
							break;
						}
					}
				}

				return courseRequests;
			},

			_processDropAdds: function(results, patterns) {
				var self = this, 
					$rows = $(results).find('h3:contains("Web Drop/Add Availability")').next('table').find('tr:gt(0)'),
					dropAddRequests = { courseAdds: {}, courseDrops: {} };

				$rows.each(function() {
					var $cols = $(this).children();
					for (var key in patterns) {
						var term = patterns[key];
						if (term && $cols[0].innerText.match(new RegExp('.*' + term.term + '.+' + term.year + '.*'))) {
							try {
								dropAddRequests.courseAdds[key] = self._extractDropAddInterval($cols[1]);
								dropAddRequests.courseDrops[key] = self._extractDropAddInterval($cols[2]);
								delete patterns[key];
							} catch (e) {
								console.log('Failed to process drop/adds intervals for date: ' + $cols[0].innerText);
								console.log(e);
							}
							break;
						}
					}
				});

				return dropAddRequests;
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

			_extractDropAddInterval: function(cell) {
				var dateParts = cell.innerText.trim().split('-');
				if (dateParts.length !== 2)
					throw new Error("Invalid drop add interval");
				return { start: Date.parse(dateParts[0].trim()), end: Date.parse(dateParts[1].trim()) };
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

