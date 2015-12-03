(function($, Handlebars, window, document, undefined) {
	var elements = {
		campusContainer: '#campus-container',
		termContainer: '#term-container',
		subjectContainer: '#subj-container',
		allSection: '#all-courses .tbody',
		watchedSection: '#observed-courses .tbody',

		menuTemplate: $('#menu-template').html(),
		menuCoursesTemplate: $('#menu-courses-template').html(),
		courseTemplate: $('#course-template').html()
	};

	var Controller = (function() {
		function Controller(backend, renderer) {
			this.backend = backend;
			this.renderer = renderer;
		}

		Controller.prototype = {
			invalidateAll: function() {
				var self = this;
				self.backend.getLatestResults(function(results) {
					if (!self._validResults(results)) return;
					self.menu = self.renderer.renderMenu(results.menu);
					self._setupPreferences(results.preferences, results.default);
				});
			},

			_validResults: function(results) {
				// temporary
				return $.isPlainObject(results) && results.loggedIn && $.isPlainObject(results.menu) &&
					results.default && $.isPlainObject(results.preferences);
			},

			_setupPreferences: function(preferences, newTerm) {
				var self = this;
				
				self.menu.$termMenu.data('preferences', preferences);
				if (newTerm) self.menu.$termMenu.val(newTerm).change();
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
	var controller = new Controller(backend, renderer);
	controller.invalidateAll();

	// temporary
	backend.getLatestResults(function(results) {
		console.log(results);
	});
})(jQuery, Handlebars, window, document);