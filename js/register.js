(function($, window, document, undefined) {

	// populate course change form
	chrome.runtime.sendMessage({ action: 'getCourseChanges', arguments: [] }, function(response) {
		if ($.isEmptyObject(response)) return;

		// additions
		var $courseFields = $('input[id^="crn_id"]'), length = Math.min($courseFields.length, response.additions.length);
		for (var i = 0; i < length; i++)
			$courseFields[i].value = response.additions[i];

		// removals
		for (var i = 0; i < response.removals.length; i++)
			$('.datadisplaytable tr input[value="' + response.removals[i] + '"]')
				.parent()
				.prev()
				.find('select[name="RSTS_IN"]')
				.val('DW');
	});
})(jQuery, window, document);