(function($, window, document, undefined) {

	// check main page
	if (!$('.pldefault td').has('a:contains("Hokie Spa")').length)
		return;

	// check if we should redirect
	chrome.runtime.sendMessage({ action: 'shouldRedirect', arguments: [] }, function(response) {
		if ($.isEmptyObject(response)) return;

		if (response.redirect) 
			window.location = response.redirect;
	});
})(jQuery, window, document);