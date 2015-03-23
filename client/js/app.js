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
	, $ = require('jquery')
	, Backbone = require('backbone')
	;
Backbone.$ = $;
var Marionette = require('backbone.marionette')
	, Router = require('./router').Router
	;

var app = new Marionette.Application();

_.extend(app, {
	templates: {},
	Controller: {},
	View: {},
	Model: {},
	Page: {},
	Scrapers: {},
	Providers: {},
	Localization: {}
});

app.router = new Router();
//app.session = new SessionModel({});


app.addRegions({
	Window: '.window'
});

var initTemplates = function () {
	var ts = [];

	_.each(document.querySelectorAll('[type="text/jade"]'), function (el) {
		var d = Q.defer();
		$.get(el.src, function(res) {
			app.templates[el.getAttribute('data-name')] = jade.compile(res);
			d.resolve(true);
		});
		ts.push(d.promise);
	});

	return Q.all(ts);
};

app.startup = function() {
	initTemplates().then(function() {
		app.start();
	});
};

app.on('before:start', function() {
	/*win.showDevTools();
	database.getSetting('position').then(function(pos) {
		if (pos) {
			win.moveTo(pos.x, pos.y);
		}
	});

	win.show();
	win.focus();*/
});

app.on('start', function(options){
	var mainWindow = new app.View.MainWindow();
	/*
	win.show();
	try {
		App.Window.show(mainWindow);
	} catch (e) {
		console.error('Couldn\'t start app: ', e, e.stack);
	}*/
});

app.close = function(callback) {
	/*console.log('before');
	console.log({x: win.x, y: win.y});
	database.setSetting('position', {x: win.x, y: win.y})
		.then(function() {
			process.exit();
		}).catch(function(e) {
			console.dir(e.stack);
		});*/
};

app.MainWindow = require('./main');

module.exports = app;