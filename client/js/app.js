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
	;

var App = new Backbone.Marionette.Application();

_.extend(App, {
	templates: {},
	Controller: {},
	View: {},
	Model: {},
	Page: {},
	Scrapers: {},
	Providers: {},
	Localization: {}
});

App.addRegions({
	Window: '.window'
});

var initTemplates = function () {
	// Load in external templates
	var ts = [];

	_.each(document.querySelectorAll('[type="text/jade"]'), function (el) {
		var d = Q.defer();
		console.log(el.src);
		$.get(el.src, function (res) {
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

App.on('before:start', function() {
	/*win.showDevTools();
	database.getSetting('position').then(function(pos) {
		if (pos) {
			win.moveTo(pos.x, pos.y);
		}
	});

	win.show();
	win.focus();*/
});

App.on('start', function(options){
	var mainWindow = new App.View.MainWindow();
	/*
	win.show();
	try {
		App.Window.show(mainWindow);
	} catch (e) {
		console.error('Couldn\'t start app: ', e, e.stack);
	}*/
});

App.close = function(callback) {
	/*console.log('before');
	console.log({x: win.x, y: win.y});
	database.setSetting('position', {x: win.x, y: win.y})
		.then(function() {
			process.exit();
		}).catch(function(e) {
			console.dir(e.stack);
		});*/
};

App.MainWindow = require('./main');

module.exports = App;