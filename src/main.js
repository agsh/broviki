const Datastore = require('nedb')
	, path = require('path')
	, db = new Datastore({ filename: path.join(require('nw.gui').App.dataPath, 'settings.db') })
	, gui = require('nw.gui')
	, win = gui.Window.get()
	;

var Main = {};

Main.close = function(callback) {
	db.update({_id: 'position'}, {x: win.x, y: win.y}, {upsert: true}, function(err) {
		process.exit();
	});
};

Main.start = function(callback) {
	win.showDevTools();
	console.log(db);
	db.loadDatabase(function (err) {
		db.findOne({_id: 'position'}, function (err, doc) {
			console.log(err || doc);
			if (doc) {
				//win.x = doc.x;
				//win.y = doc.y;
				win.moveTo(doc.x, doc.y);
			}
			win.show();
			win.focus();
		});
	});
};

Main.minimize = function() {
	win.minimize();
};

Main.start();
