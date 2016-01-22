(function($, Handlebars, window, document, undefined) {
	var elements = {
		notificationContainer: '#notification-container',
		campusContainer: '#campus-container',
		termContainer: '#term-container',
		subjectContainer: '#subj-container',
		allSection: '#all-courses .tbody',
		watchedSection: '#observed-courses .tbody',
		submitButton: '#submit-preferences',
		closeButtons: '.close',
		dialog: '#dialog',

		menuTemplate: 'menu',
		menuCoursesTemplate: 'menu-courses',
		courseTemplate: 'course',
		notificationTemplate: 'notification'
	};

	var Controller = (function() {
		function Controller(elements, backend, renderer) {
			this.backend = backend;
			this.renderer = renderer;

			this.allSectionRows = elements.allSection + ' tr';
			this.watchedSectionRows = elements.watchedSection + ' tr';
			this.closeButtons = elements.closeButtons;

			this.$body = $('body');
			this.$submitButton = $(elements.submitButton);
			this.$dialog = $(elements.dialog);
		}

		Controller.prototype = {
			invalidateAll: function() {
				var self = this;

				self.backend.getLatestResults(function(results) {
					if (!self._validResults(results)) return;
					self.watchedCourses = $.extend({}, results.watched);
					self._setupNotifications(results.importantDates, results.default);
					self.menu = self.renderer.renderMenu(results.menu);
					self._setupPreferences(results.preferences, results.default);
					self._setupGlobalListeners();
					if (results.courses.length > 0)
						self.renderer.renderCourses(results.courses, results.registered, results.watched);
					else
						self._updatePreferences();
				});
			},

			_validResults: function(results) {
				return $.isPlainObject(results) && results.loggedIn && $.isPlainObject(results.menu) &&
					results.default && $.isPlainObject(results.preferences) && $.isArray(results.courses) &&
					$.isPlainObject(results.registered) && $.isPlainObject(results.watched) && 
					$.isPlainObject(results.importantDates);
			},

			_setupPreferences: function(preferences, newTerm) {
				var self = this;
				
				self.menu.$termMenu.data('preferences', preferences);
				if (newTerm) self.menu.$termMenu.val(newTerm).change();
			},

			_setupGlobalListeners: function() {
				var self = this;

				self.$dialog.dialog({
					autoOpen: false,
					width: 300,
					resizable: false,
					draggable: false,
					modal: true,
					buttons: [
						{
							text: 'Yes',
							click: function() {
								var $this = $(this);
								self.backend.dropCourse(self.menu.$termMenu.val(), $this.data('crn'));
								$this.dialog('close');
							}
						},
						{
							text: 'No',
							click: function() {
								$(this).dialog('close');
							}
						}
					]
				});

				self.$body
					.off('click')
					.on('click', self.allSectionRows, function(e) {
						if ($(e.originalEvent.target).is('a')) return;
						var $row = $(this);
						self.renderer.addToWatched($row);
						self.watchedCourses[$row.data('crn')] = 'U';
						self.backend.updateWatchedCourses(self.menu.$termMenu.val(), self.watchedCourses);
					})
					.on('click', self.watchedSectionRows, function(e) {
						if ($(e.originalEvent.target).is('a')) return;
						var $row = $(this);
						if (self.availableRequests && 
							self.availableRequests.courseDrops && 
							$row.data('registered')) {
							self.$dialog.data('crn', $row.data('crn')).dialog('open');
						} else {
							self.renderer.removeFromWatched($row);
							delete self.watchedCourses[$row.data('crn')];
							self.backend.updateWatchedCourses(self.menu.$termMenu.val(), self.watchedCourses);
						}
					})
					.on('click', self.closeButtons, function(e) {
						e.preventDefault();
						$(this).parent().animate({ height: 0, opacity: 0 }, null, function() { $(this).remove(); });
					});

				self.$submitButton
					.off('click')
					.on('click', function(e) {
						e.preventDefault();
						self._updatePreferences();
					});
			},

			_updatePreferences: function() {
				var self = this;

				var preferences = {};
				preferences[self.menu.$termMenu.attr('name')] = self.menu.$termMenu.val();
				preferences[self.menu.$campusMenu.attr('name')] = self.menu.$campusMenu.val();
				preferences[self.menu.$subjectMenu.attr('name')] = self.menu.$subjectMenu.val();

				self.backend.updatePreferences(preferences, function(results) {
					if (!self._validResults(results)) return;
					self._setupNotifications(results.importantDates, results.default);
					self.renderer.renderCourses(results.courses, results.registered, results.watched);
				});
			},

			_setupNotifications: function(importantDates, term) {
				var self = this;

				var notifications = [];
				self.availableRequests = {};
				for (var prop in importantDates) {
					if (importantDates[prop][term] && importantDates[prop][term].available) {
						notifications.push({ event: prop, endDate: new Date(importantDates[prop][term].end) });
						self.availableRequests[prop] = true;
					}
				}

				self.renderer.renderNotifications(notifications);
			}
		};

		return Controller;
	})();

	var Backend = (function() {
		function Backend() {
		}
	
		Backend.prototype = {
			updatePreferences: function(preferences, callback) {
				this._internalRequest('updatePreferences', $(preferences).toArray(), callback);
			},

			updateWatchedCourses: function(termyear, watchedCourses) {
				this._internalRequest('updateWatchedCourses', $(arguments).toArray());
			},

			getLatestResults: function(callback) {
				this._internalRequest('getLatestResults', [], callback);
			},

			dropCourse: function(termyear, course) {
				this._internalRequest('dropCourse', $(arguments).toArray());
			},

			_internalRequest: function(action, argumentArray, callback) {
				chrome.runtime.sendMessage({ action: action, arguments: argumentArray }, function(response) { 
					if ($.isFunction(callback)) callback(response);
				});
			}
		};
	
		return Backend;
	})();

	var Renderer = (function() {
		function Renderer(elements) {
			// notifications
			this.$notificationContainer = $(elements.notificationContainer);

			// menu
			this.$campusContainer = $(elements.campusContainer);
			this.$termContainer = $(elements.termContainer);
			this.$subjectContainer = $(elements.subjectContainer);

			// courses
			this.$allSection = $(elements.allSection);
			this.$watchedSection = $(elements.watchedSection);

			this._initializeHandlebars(elements);
		}

		Renderer.prototype = {
			renderMenu: function(menuResults) {
				var self = this, menu = {};

				menu.$campusMenu = $(self.menuTemplate({ name: 'CAMPUS', values: menuResults.CAMPUS })).appendTo(self.$campusContainer.empty());
				menu.$subjectMenu = $(self.menuCoursesTemplate({ name: 'subj_code', values: menuResults.subj_code })).appendTo(self.$subjectContainer.empty()).first();
				menu.$termMenu = $(self.menuTemplate({ name: 'TERMYEAR', values: menuResults.TERMYEAR })).appendTo(self.$termContainer.empty());
				menu.$termMenu.on('change', function() {
					var preferences = menu.$termMenu.data('preferences') || {};
					var currentTerm = $(this).val();
					self._changeCourses(menu.$subjectMenu, currentTerm);
					if (preferences[currentTerm]) {
						menu.$campusMenu.val(preferences[currentTerm].CAMPUS);
						menu.$subjectMenu.val(preferences[currentTerm].subj_code);
					}
				});

				return menu;
			},

			renderCourses: function(allCourses, registered, watched) {
				var self = this;

				self.$allSection.empty();
				self.$watchedSection.empty();
				allCourses.forEach(function(course) {
					course.Registered = registered.hasOwnProperty(course.CRN);
					var $row = $(self.courseTemplate(course));
					if (registered.hasOwnProperty(course.CRN) || 
						watched.hasOwnProperty(course.CRN)) {
						self.$watchedSection.append($row.clone());
						$row.hide();
					}
					self.$allSection.append($row);
				});
			},

			renderNotifications: function(notifications) {
				var self = this;

				self.$notificationContainer.empty();
				notifications.forEach(function(notification) {
					notification.event = notification.event.replace(/([A-Z])/g, ' $1').toUpperCase();
					notification.endDate = notification.endDate.toLocaleDateString();
					self.$notificationContainer.append(self.notificationTemplate(notification));
				});
			},

			addToWatched: function($row) {
				var self = this;

				self.$watchedSection.append($row.clone());
				$row.hide();
			},

			removeFromWatched: function($row) {
				var self = this;

				self.$allSection.find('tr[data-crn="' + $row.data('crn') + '"]').show();
				$row.remove();
			},

			_initializeHandlebars: function(elements) {
				var self = this;

				// templates
				self.menuTemplate = Handlebars.templates[elements.menuTemplate];
				self.menuCoursesTemplate = Handlebars.templates[elements.menuCoursesTemplate];
				self.courseTemplate = Handlebars.templates[elements.courseTemplate];
				self.notificationTemplate = Handlebars.templates[elements.notificationTemplate];

				// helpers
				Handlebars.registerHelper('bool', function(context) {
					return context ? 'Yes' : 'No';
				});
			},

			_changeCourses: function($selectMenu, currentTerm) {
				var lastTerm = $selectMenu.data('lastTerm');
				if (lastTerm === currentTerm) return;
				var options = $selectMenu.children().detach();
				$('#subj_code-' + lastTerm).append(options);
				options = $('#subj_code-' + currentTerm + ' option').detach();
				$selectMenu.append(options).data('lastTerm', currentTerm).val($selectMenu.children().first().val());
			}
		};

		return Renderer;
	})();

	// initialize objects
	var backend = new Backend();
	var renderer = new Renderer(elements);
	var controller = new Controller(elements, backend, renderer);
	controller.invalidateAll();

	// for testing purposes
	// backend.getLatestResults(function(results) {
	// 	console.log(results);
	// });
})(jQuery, Handlebars, window, document);