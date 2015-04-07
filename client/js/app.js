var jade = require('jade')
	, _ = require('lodash')
	, $ = require('jquery')
	, Backbone = require('backbone')
	;
Backbone.$ = $;
var Marionette = require('backbone.marionette')
	;
var templates = require('./templates')
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

App.startup = function() {
	//initTemplates().then(function() {
		App.start();
	//});
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