var coursesUrl = 'https://banweb.banner.vt.edu/ssb/prod/HZSKVTSC.P_ProcRequest';
var timetableUrl = 'https://banweb.banner.vt.edu/ssb/prod/hzskschd.P_CrseSchdDetl';
var template = Handlebars.compile($("#template").html());

var watched = $('#watched-courses .tbody');
var all = $('#all-courses .tbody');

var watchedCourses = get('watchedCourses');

function fetchCourses(postObject) {
	if (postObject) {
		var data = $.extend({ 
			CORE_CODE: 'AR%', 
			SCHDTYPE: '%', 
			BTN_PRESSED: 'FIND class sections'
		}, postObject);

		return $.post(coursesUrl, data);
	} else {
		return $.get(coursesUrl);
	}
}

function fetchTimetable(term, callback) {
	$.get(timetableUrl, { term_in: term }).done(function(results) {
		var watchedCourses = get('watchedCourses');
		$(results).find('table.datadisplaytable tr:gt(1) td:first-child > a').each(function(i, e) {
			watchedCourses[this.text.trim()] = 'R';
		});
		callback(watchedCourses);
	});
}

function populateMenu($results, preferences) {
	// TODO refactor
	var campus = $results.find('select[name="CAMPUS"]').appendTo('#campus-container');
	if (preferences['CAMPUS']) campus.val(preferences['CAMPUS']);

	var subj_code = $('<select></select>', { name: 'subj_code' }).appendTo('#subj-container');

	eval($results[3].text); // blah
	var termyear = $results
		.find('select[name="TERMYEAR"]')
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

	$('<input></input>', { value: 'Find Courses', type: 'button' }).on('click', function() {
		var formObject = {};
		$('form[name="ttform"]').serializeArray().forEach(function(element) {
			formObject[element.name] = element.value;
		});
		store('preferences', formObject);
		fetchCourses(formObject).done(function(results) {
			populateCoursesSection($(results));
		});
	}).appendTo('#button-container');
}

function populateCoursesSection($results, watchedCourses) {
	var $coursesRows = $results.find('table.dataentrytable tr');
	if (!$coursesRows)
		return;

	var properties = $.map($coursesRows.first().children(), function(e) { return e.innerText.split(' ')[0].trim(); });
	$.each($coursesRows.slice(1), function(i, e) {
		var course = {};
		var cols = e.children;
		for (var j = 0, i = 0; i < cols.length; i++, j++) {
			try {
				if (cols[i].colSpan > 1)
					j += cols[i].colSpan - 1;
				if (cols[i].innerText.match('(ARR)') || cols[i].innerText === 'TBA')
					continue;
				else if (properties[j] === 'Capacity')
					course[properties[j]] = Number.parseInt(cols[i].innerText);
				else if (properties[j] === 'Seats') {
					var seats = cols[j].innerText.match(/-?\d+/);
					if (seats)
						course[properties[j]] = Number.parseInt(seats[0]);
				}
				else if (properties[j] === 'CRN') {
					var crn = $(cols[j]).find('a');
					if (crn.length > 1)
						course['Link'] = crn[0].href;
					course[properties[j]] = cols[i].innerText.trim();
					course['Registered'] = watchedCourses[course[properties[j]]] === 'R';
				} else
					course[properties[j]] = cols[i].innerText.trim();
			} catch (e) {
				console.log('Failed to parse: ' + cols[i].innerText);
				console.log(e);
			}
		}

		if (course.CRN) {
			var $row = $(template(course));
			if (watchedCourses.hasOwnProperty(course.CRN)) {
				watched.append($row.clone());
				$row.hide();
			}
			all.append($row);
		}
	});

	$('#container').show();
}

function setHandlers() {
	$('body').on('click', '#all-courses tbody tr', function() {
		var $this = $(this);
		watched.append($this.clone());
		watchedCourses = get('watchedCourses');
		watchedCourses[$this.data('orig').CRN] = 'U';
		store('watchedCourses', watchedCourses);
		$this.hide();
	}).on('click', '#watched-courses tbody tr', function() {
		var $this = $(this);
		all.find('td:contains(' + $this.data('orig').CRN + ')').parent().show();
		watchedCourses = get('watchedCourses');
		delete watchedCourses[$this.data('orig').CRN];
		store('watchedCourses', watchedCourses);
		$this.remove();
	});
}

function checkRegistrations(results) {
	if (Object.keys(watchedCourses).length == 0)
		return;

	var $coursesRows = $(results).find('table.dataentrytable tr');
	var seatIndex = $coursesRows.find('td:contains("Seats")').index();
	if (seatIndex === -1)
		return;

	var titleIndex = $coursesRows.find('td:contains("Title")').index();
	for (var prop in watchedCourses) {
		var $courseRow = $coursesRows.filter('tr:contains("' + prop +'")');
		if ($courseRow.length == 0)
			continue;

		var freeSeats = Number.parseInt($courseRow.find('td:eq("' + seatIndex + '")').text().match(/-?\d+/)[0]);
		if (freeSeats > 0) {
			var title = $courseRow.find('td:eq("' + titleIndex + '")').text();
			chrome.notifications.clear(prop, function() {});
			chrome.notifications.create(prop, {
				type: 'basic',
	          	title: 'Course Notification',
	          	message: title + ' can be registered',
	          	iconUrl: 'favicon.png'
			}, function(id) {});
		}
	}
}

function store(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function get(key) {
	return JSON.parse(localStorage.getItem(key)) || {};
}

function clear(key) {
	localStorage.removeItem(key);
}

Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});
Handlebars.registerHelper('bool', function(context) {
	return context ? 'Yes' : 'No';
});

setHandlers();
var preferences = get('preferences');
fetchCourses(preferences).done(function(results) {
	var $results = $(results);
	populateMenu($results, preferences);
	fetchTimetable(preferences['TERMYEAR'], function(watchedCourses) {
		populateCoursesSection($results, watchedCourses);
	});
});

if (Object.keys(preferences).length > 0) {
	setInterval(function() {
		fetchCourses(preferences).done(checkRegistrations);
	}, 20 * 1000);
}

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {

var isRefererSet = false;
var headers = details.requestHeaders,
    blockingResponse = {};

for (var i = 0, l = headers.length; i < l; ++i) {
    if (headers[i].name == 'Referer') {
        headers[i].value = "https://banweb.banner.vt.edu/ssb/prod/hzskstat.P_DispRegStatPage";
        isRefererSet = true;
        break;
    }
}

if (!isRefererSet) {
    headers.push({
        name: "Referer",
        value: "https://banweb.banner.vt.edu/ssb/prod/hzskstat.P_DispRegStatPage"
    });
}

blockingResponse.requestHeaders = headers;
return blockingResponse;
}, {
    urls: ["<all_urls>"]
}, ['requestHeaders', 'blocking']);
		
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

