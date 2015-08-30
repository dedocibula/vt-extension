var coursesUrl = 'https://banweb.banner.vt.edu/ssb/prod/HZSKVTSC.P_ProcRequest';
var timetableUrl = 'https://banweb.banner.vt.edu/ssb/prod/hzskschd.P_CrseSchdDetl';
var template = Handlebars.compile($("#template").html());

var watched = $('#watched-courses .tbody');
var all = $('#all-courses .tbody');

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
		console.log(results);
		var watchedCourses = get('watchedCourses');
		$(results).find('table.datadisplaytable tr:gt(1) td:first-child > a').each(function(i, e) {
			watchedCourses[this.text.trim()] = 'R';
		});
		store('watchedCourses', watchedCourses);
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
						course['Seats'] = Number.parseInt(seats[0]);
				}
				else if (properties[j] === 'CRN') {
					var crn = $(cols[j]).find('a');
					if (crn.length > 1)
						course['Link'] = crn[0].href;
					course[properties[j]] = cols[i].innerText.trim();
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
		var watchedCourses = get('watchedCourses');
		watchedCourses[$this.data('orig').CRN] = 'M';
		store('watchedCourses', watchedCourses);
		$this.hide();
	}).on('click', '#watched-courses tbody tr', function() {
		var $this = $(this);
		all.find('td:contains(' + $this.data('orig').CRN + ')').parent().show();
		var watchedCourses = get('watchedCourses');
		delete watchedCourses[$this.data('orig').CRN];
		store('watchedCourses', watchedCourses);
		$this.remove();
	});
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

setHandlers();
var preferences = get('preferences');
fetchCourses(preferences).done(function(results) {
	var $results = $(results);
	populateMenu($results, preferences);
	fetchTimetable(preferences['TERMYEAR'], function(watchedCourses) {
		populateCoursesSection($results, watchedCourses);
	});
});

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

