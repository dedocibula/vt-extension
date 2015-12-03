(function($, Handlebars, window, document, undefined) {
	var elements = {
		campusContainer: '#campus-container',
		termContainer: '#term-container',
		subjectContainer: '#subj-container',
		allSection: '#all-courses .tbody',
		watchedSection: '#observed-courses .tbody',
		submitButton: '#submit-preferences',

		menuTemplate: $('#menu-template').html(),
		menuCoursesTemplate: $('#menu-courses-template').html(),
		courseTemplate: $('#course-template').html()
	};

	var Controller = (function() {
		function Controller(elements, backend, renderer) {
			this.backend = backend;
			this.renderer = renderer;

			this.allSectionRows = elements.allSection + ' tr';
			this.watchedSectionRows = elements.watchedSection + ' tr';

			this.$body = $('body');
			this.$submitButton = $(elements.submitButton);
		}

		Controller.prototype = {
			invalidateAll: function() {
				var self = this;

				self.backend.getLatestResults(function(results) {
					if (!self._validResults(results)) return;
					self.watchedCourses = $.extend({}, results.watched);
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
					$.isPlainObject(results.registered) && $.isPlainObject(results.watched);
			},

			_setupPreferences: function(preferences, newTerm) {
				var self = this;
				
				self.menu.$termMenu.data('preferences', preferences);
				if (newTerm) self.menu.$termMenu.val(newTerm).change();
			},

			_setupGlobalListeners: function() {
				var self = this;

				self.$body
					.off('click')
					.on('click', self.allSectionRows, function() {
						var $row = $(this);
						self.renderer.addToWatched($row);
						self.watchedCourses[$row.data('crn')] = 'U';
						self.backend.updateWatchedCourses(self.menu.$termMenu.val(), self.watchedCourses);
					})
					.on('click', self.watchedSectionRows, function() {
						var $row = $(this);
						self.renderer.removeFromWatched($row);
						delete self.watchedCourses[$row.data('crn')];
						self.backend.updateWatchedCourses(self.menu.$termMenu.val(), self.watchedCourses);
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
					self.renderer.renderCourses(results.courses, results.registered, results.watched);
				});
			}
		};

		return Controller;
	})();

	var Renderer = (function() {
		function Renderer(elements) {
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
				self.menuTemplate = Handlebars.compile(elements.menuTemplate);
				self.menuCoursesTemplate = Handlebars.compile(elements.menuCoursesTemplate);
				self.courseTemplate = Handlebars.compile(elements.courseTemplate);

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
	var backend = chrome.extension.getBackgroundPage();
	var renderer = new Renderer(elements);
	var controller = new Controller(elements, backend, renderer);
	controller.invalidateAll();

	// temporary
	backend.getLatestResults(function(results) {
		console.log(results);
	});
})(jQuery, Handlebars, window, document);