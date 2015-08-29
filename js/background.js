var url = 'https://banweb.banner.vt.edu/ssb/prod/HZSKVTSC.P_ProcRequest';

function fetchCourses(postObject) {
	if (postObject) {
		var data = $.extend({ 
			CORE_CODE: 'AR%25', 
			SCHDTYPE: '%25', 
			BTN_PRESSED: 'FIND+class+sections'
		}, postObject);

		return $.post(url, data);
		// data: 'CAMPUS=0&TERMYEAR=201509&CORE_CODE=AR%25&subj_code=CS&SCHDTYPE=%25&CRSE_NUMBER=&crn=&open_only=&BTN_PRESSED=FIND+class+sections&inst_name='
	} else {
		return $.get(url);
	}
}


function populateMenu(courses, preferences) {
	var $courses = $(courses);

	// TODO refactor
	var campus = $courses.find('select[name="CAMPUS"]').appendTo('#campus-container');
	if (preferences['CAMPUS']) campus.val(preferences['CAMPUS']);

	var subj_code = $('<select></select>', { name: 'subj_code' }).appendTo('#subj-container');

	eval($courses[3].text); // blah
	var termyear = $courses.find('select[name="TERMYEAR"]')
		.find('option:first')
		.remove()
		.end()
		.removeAttr('onchange')
		.on('change', function() {
			var val = $(this).val();
			dropdownlist(val);
			subj_code.find('option:first').remove();
			if (preferences['TERMYEAR'] === val && preferences['subj_code']) 
				subj_code.val(preferences['subj_code']);
		})
		.appendTo('#term-container');
	if (preferences['TERMYEAR']) 
		termyear.val(preferences['TERMYEAR']);
	termyear.change();

	$('<input></input>', { value: 'Submit', type: 'button' }).on('click', function() {
		var formObject = {};
		$('form[name="ttform"]').serializeArray().forEach(function(element) {
			formObject[element.name] = element.value;
		});
		store('preferences', formObject);
	}).appendTo('#button-container');
}

function store(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function get(key) {
	return JSON.parse(localStorage.getItem(key)) || {};
}

fetchCourses().done(function(courses) {
	var preferences = get('preferences');
	populateMenu(courses, preferences);
});
		
		// var capacity = Number.parseInt($(results).find('tr:contains("82220")').find('td:eq(5)').text().match(/-?\d+/)[0]);
		// console.log(capacity);
		// if (capacity > 0) {
		// 	chrome.notifications.clear('82220', function() {});
		// 	chrome.notifications.create('82220', {
		// 		type: 'basic',
	 //          	title: 'Register Multiprocessor Programming',
	 //          	message: 'Register Multiprocessor Programming',
	 //          	iconUrl: 'icon48.png'
		// 	}, function(id) {});
		// }

// setInterval(queryVT, 10000);

