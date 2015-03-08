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

const gui = require('nw.gui')
	, win = gui.Window.get()
	;

var App = {};

App.close = function(callback) {
	console.log('before');
	console.log({x: win.x, y: win.y});
	Database.setSetting('position', {x: win.x, y: win.y})
		.then(function() {
			process.exit();
		}).catch(function(e) {
			console.dir(e.stack);
		});
};

App.start = function(callback) {
	win.showDevTools();
	Database.getSetting('position').then(function(pos) {
		if (pos) {
			win.moveTo(pos.x, pos.y);
		}
	});

	win.show();
	win.focus();
};

App.minimize = function() {
	win.minimize();
};

App.start();
