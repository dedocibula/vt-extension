(function($, Handlebars, window, document, undefined) {
	var Controller = (function() {
		function Controller(backend, renderer) {
			this.backend = backend;
			this.renderer = renderer;
		}

		Controller.prototype = {
			invalidateAll: function() {
				var self = this;
				self.backend.getLatestResults(function(results) {
					// todo if (results.loggedIn)

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

			this.menuTemplate = Handlebars.compile(elements.menuTemplate);

			// courses
			this.$allSection = $(elements.allSection);
			this.$watchedSection = $(elements.watchedSection);

			this.courseTemplate = Handlebars.compile(elements.courseTemplate);
		}

		Renderer.prototype = {

		};

		return Renderer;
	})();

	// initialize objects
	var backend = chrome.extension.getBackgroundPage();
	var renderer = new Renderer({
		campusContainer: '#campus-container',
		termContainer: '#term-container',
		subjectContainer: '#subj-container',
		allSection: '#all-courses .tbody',
		watchedSection: '#observed-courses .tbody',

		menuTemplate: $('#menuTemplate').html(),
		courseTemplate: $('#courseTemplate').html()
	});
	var controller = new Controller(backend, renderer);

	// temporary
	backend.getLatestResults(function(results) {
		console.log(results);
	});
})(jQuery, Handlebars, window, document);