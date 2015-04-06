/*
var App = new Backbone.Marionette.Application();

_.extend(App, {
	Controller: {},
	View: {},
	Model: {},
	Page: {},
	Scrapers: {},
	Providers: {},
	Localization: {}
});

// set database
App.db = Database;

// Set settings
App.advsettings = AdvSettings;
App.settings = Settings;*/

var Q = require('q')
	, jade = require('jade')
	, _ = require('lodash')
	, $ = require('jquery')
	, Backbone = require('backbone')
	;
Backbone.$ = $;
var Marionette = require('backbone.marionette')
	;

// Chrome dev-plugins support
if (window.__agent) {
	window.__agent.start(Backbone, Marionette);
}

var App = new Marionette.Application();
module.exports.App = App;

var MainWindow = require('./main').MainWindow;
var Test = require('./apps/test/app');

App.addRegions({
	window: '.window'
});

var initTemplates = function () {
	var ts = [];
	_.each(document.querySelectorAll('[type="text/jade"]'), function (el) {
		var d = Q.defer();
		$.get(el.src, function(res) {
			App.templates[el.getAttribute('data-name')] = jade.compile(res);
			d.resolve(true);
		});
		ts.push(d.promise);
	});
	return Q.all(ts);
};

App.startup = function() {
	initTemplates().then(function() {
		App.start();
	});
};

App.navigate = function(route, options){
	options || (options = {});
	Backbone.history.navigate(route, options);
};

App.getCurrentRoute = function(){
	return Backbone.history.fragment
};

App.on('start', function(options){
	if (Backbone.history){
		Backbone.history.start();
		if (this.getCurrentRoute() === ''){
			App.trigger('test:test');
		}
	}
});

window.App = App;