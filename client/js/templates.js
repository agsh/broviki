/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 19.03.15.
 */

var Marionette = require('backbone.marionette')
	, jade = require('jade')
	, _ = require('lodash')
	, $ = require('jquery')
	;

/*Marionette.TemplateCache.prototype.loadTemplate = function(templateId, options){
	// load your template here, returning the data needed for the compileTemplate
	// function. For example, you have a function that creates templates based on the
	// value of templateId
	console.log(templateId);
	//$.get('templates/test.jade', function(d) {console.log(d);});
	// send the template back
	return '<h1>templ</h1>';
};*/

var initTemplates = function () {
	/*var ts = [];
	_.each(document.querySelectorAll('[type="text/jade"]'), function (el) {
		var defer = $.Deferred();
		$.get(el.src, function(res) {
	 App.templates[el.getAttribute('data-name')] = jade.compile(res);
	 d.resolve(true);
	 });
	 ts.push(d.promise);
	 });
	 return Q.all([]);
*/
};

module.exports.initTemplates = initTemplates;