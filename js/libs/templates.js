(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['course'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "		<a class=\"show-details\" href="
    + alias4(((helper = (helper = helpers.Link || (depth0 != null ? depth0.Link : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Link","hash":{},"data":data}) : helper)))
    + " target=\"_blank\">"
    + alias4(((helper = (helper = helpers.CRN || (depth0 != null ? depth0.CRN : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"CRN","hash":{},"data":data}) : helper)))
    + "</a>\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper;

  return "		"
    + container.escapeExpression(((helper = (helper = helpers.CRN || (depth0 != null ? depth0.CRN : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"CRN","hash":{},"data":data}) : helper)))
    + "\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<tr data-crn='"
    + alias4(((helper = (helper = helpers.CRN || (depth0 != null ? depth0.CRN : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"CRN","hash":{},"data":data}) : helper)))
    + "' data-registered='"
    + alias4(((helper = (helper = helpers.Registered || (depth0 != null ? depth0.Registered : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Registered","hash":{},"data":data}) : helper)))
    + "'>\r\n	<td>"
    + alias4((helpers.bool || (depth0 && depth0.bool) || alias2).call(alias1,(depth0 != null ? depth0.Registered : depth0),{"name":"bool","hash":{},"data":data}))
    + "</td>\r\n	<td>\r\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.Link : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data})) != null ? stack1 : "")
    + "	</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Course || (depth0 != null ? depth0.Course : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Course","hash":{},"data":data}) : helper)))
    + " - "
    + alias4(((helper = (helper = helpers.Title || (depth0 != null ? depth0.Title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Title","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Type || (depth0 != null ? depth0.Type : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Type","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Cr || (depth0 != null ? depth0.Cr : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Cr","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Seats || (depth0 != null ? depth0.Seats : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Seats","hash":{},"data":data}) : helper)))
    + "/"
    + alias4(((helper = (helper = helpers.Capacity || (depth0 != null ? depth0.Capacity : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Capacity","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Instructor || (depth0 != null ? depth0.Instructor : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Instructor","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Days || (depth0 != null ? depth0.Days : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Days","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Begin || (depth0 != null ? depth0.Begin : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Begin","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.End || (depth0 != null ? depth0.End : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"End","hash":{},"data":data}) : helper)))
    + "</td>\r\n	<td>"
    + alias4(((helper = (helper = helpers.Location || (depth0 != null ? depth0.Location : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"Location","hash":{},"data":data}) : helper)))
    + "</td>\r\n</tr>";
},"useData":true});
templates['menu-courses'] = template({"1":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "	<div id=\""
    + alias2(alias1((depths[1] != null ? depths[1].name : depths[1]), depth0))
    + "-"
    + alias2(alias1(blockParams[0][1], depth0))
    + "\">\r\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},blockParams[0][0],{"name":"each","hash":{},"fn":container.program(2, data, 1, blockParams, depths),"inverse":container.noop,"data":data,"blockParams":blockParams})) != null ? stack1 : "")
    + "	</div>\r\n";
},"2":function(container,depth0,helpers,partials,data,blockParams) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},blockParams[0][0],{"name":"each","hash":{},"fn":container.program(3, data, 2, blockParams),"inverse":container.noop,"data":data,"blockParams":blockParams})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data,blockParams) {
    var alias1=container.lambda, alias2=container.escapeExpression;

  return "		<option value=\""
    + alias2(alias1(blockParams[0][1], depth0))
    + "\">"
    + alias2(alias1(blockParams[0][0], depth0))
    + "</option>\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<select name=\""
    + container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data,"blockParams":blockParams}) : helper)))
    + "\">\r\n</select>\r\n<div style=\"display:none\">\r\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.values : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 2, blockParams, depths),"inverse":container.noop,"data":data,"blockParams":blockParams})) != null ? stack1 : "")
    + "</div>";
},"useData":true,"useDepths":true,"useBlockParams":true});
templates['menu'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, alias1=container.escapeExpression;

  return "	<option value=\""
    + alias1(((helper = (helper = helpers.key || (data && data.key)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"key","hash":{},"data":data}) : helper)))
    + "\">"
    + alias1(container.lambda(depth0, depth0))
    + "</option>\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<select name=\""
    + container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\">\r\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.values : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</select>";
},"useData":true});
templates['notification'] = template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div id=\"flash\" class=\"warn\">\r\n	<a href=\"#\" class=\"close\">×</a>\r\n	<div>\r\n		<img alt=\"logo\" src=\"images/glyphicons_warning_sign.png\" width=\"10\" height=\"10\">\r\n		"
    + alias4(((helper = (helper = helpers.event || (depth0 != null ? depth0.event : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"event","hash":{},"data":data}) : helper)))
    + " are available until "
    + alias4(((helper = (helper = helpers.endDate || (depth0 != null ? depth0.endDate : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"endDate","hash":{},"data":data}) : helper)))
    + ".\r\n	</div>\r\n</div>";
},"useData":true});
})();