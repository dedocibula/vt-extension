(function($, Handlebars, window, document, undefined) {
	var elements = {
		campusContainer: '#campus-container',
		termContainer: '#term-container',
		subjectContainer: '#subj-container',
		allSection: '#all-courses .tbody',
		watchedSection: '#observed-courses .tbody',

		menuTemplate: $('#menuTemplate').html(),
		courseTemplate: $('#courseTemplate').html()
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
					self menu = self.renderer.renderMenu(results.menu);
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
				if (newTerm) self.menu.$termMenu.val(newTerm);
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

			this.menuTemplate = Handlebars.compile(elements.menuTemplate);

			// courses
			this.$allSection = $(elements.allSection);
			this.$watchedSection = $(elements.watchedSection);

			this.courseTemplate = Handlebars.compile(elements.courseTemplate);
		}

		Renderer.prototype = {
			renderMenu: function(menuResults) {
				var self = this, menu = {};

				menu.$campusMenu = $(menuTemplate({ CAMPUS: menuResults.CAMPUS })).appendTo(self.$campusContainer.empty());
				menu.$subjectMenu = $(menuTemplate({ subj_code: menuResults.subj_code })).appendTo(self.$subjectContainer.empty());
				menu.$termMenu = $(menuTemplate({ TERMYEAR: menuResults.TERMYEAR })).appendTo(self.$termContainer.empty());
				menu.$termMenu.on('change', function() {
					var preferences = menu.$termMenu.data('preferences') || {};
					var currentTerm = $(this).val();
					if (preferences[currentTerm]) {
						menu.$campusMenu.val(preferences[currentTerm].CAMPUS);
						menu.$subjectMenu.val(preferences[currentTerm].subj_code);
					}
				}));

				return menu;
			}
		};

		return Renderer;
	})();

	// initialize objects
	var backend = chrome.extension.getBackgroundPage();
	var renderer = new Renderer(elements);
	var controller = new Controller(backend, renderer);

	// temporary
	backend.getLatestResults(function(results) {
		console.log(results);
	});
})(jQuery, Handlebars, window, document);