const Datastore = require('nedb')
	, path = require('path')
	, dataPath = require('nw.gui').App.dataPath
	, Q = require('q')
	;

var db = {
	settings: new Datastore({
		filename: path.join(dataPath, 'settings.db')
		, autoload: true
	})
};

function promisifyDatastore(datastore) {
	datastore.insert = Q.denodeify(datastore.insert, datastore);
	datastore.update = Q.denodeify(datastore.update, datastore);
	datastore.remove = Q.denodeify(datastore.remove, datastore);
}

promisifyDatastore(db.settings);

// This utilizes the exec function on nedb to turn function calls into promises
var promisifyDb = function(obj) {
	return Q.Promise(function(resolve, reject) {
		obj.exec(function(error, result) {
			if (error) {
				return reject(error);
			} else {
				return resolve(result);
			}
		});
	});
};

var Database = {};

Database.getSetting= function(name) {
	return promisifyDb(db.settings.findOne({
		_id: name
	}));
};

Database.getSettings = function() {
	return promisifyDb(db.settings.find({}));
};

Database.setSetting= function(key, value) {
	return db.settings.update({
		_id: key
	}, value, {
		upsert: true
	});
};

Database.writeSetting = function (data) {
	return Database.getSetting({
		key: data.key
	})
		.then(function (result) {
			if (result) {
				return db.settings.update({
					_id: data.key
				}, {
					$set: data
				}, {});
			} else {
				return db.settings.insert(data);
			}
		});
};