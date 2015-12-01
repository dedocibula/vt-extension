(function($, Handlebars, window, document, undefined) {
	var Controller = (function() {
		function Controller(backend, renderer) {
			this.backend = backend;
			this.renderer = renderer;
		}

		Controller.prototype = {
			// methods...
		};

		return Controller;
	})();

	var Renderer = (function() {
		function Renderer() {
		}

		Renderer.prototype = {

		};

		return Renderer;
	})();

	// initialize objects
	var backend = chrome.extension.getBackgroundPage();
	var controller = new Controller(new Renderer());

	// temporary
	backend.getLatestResults(function(results) {
		console.log(results);
	});
})(jQuery, Handlebars, window, document);