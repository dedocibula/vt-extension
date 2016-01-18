(function($, window, document, undefined) {

	// populate course change form
	chrome.runtime.sendMessage({ action: 'getAddibleCourses', arguments: [] }, function(response) {
		if ($.isEmptyObject(response)) return;
		var $courseFields = $('input[id^="crn_id"]'), length = Math.min($courseFields.length, response.length);
		for (var i = 0; i < length; i++)
			$courseFields[i].value = response[i];
	});
})(jQuery, window, document);