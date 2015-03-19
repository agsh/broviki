const Datastore = require('nedb')
	, path = require('path')
	, config = require('../config')
	, bcrypt = require('bcrypt')
	, dataPath = config.dataPath
	, Q = require('q')
	;

var db = {
	settings: new Datastore({
		filename: path.join(dataPath, 'settings.db')
		, autoload: true
	})
	, users: new Datastore({
	    filename: path.join(dataPath, 'users.db')
		, autoload: true
	})
};

function promisifyDatastore(datastore) {
	datastore.insert = Q.denodeify(datastore.insert, datastore);
	datastore.update = Q.denodeify(datastore.update, datastore);
	datastore.remove = Q.denodeify(datastore.remove, datastore);
}

promisifyDatastore(db.settings);
promisifyDatastore(db.users);

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

var database = {};

database.getSetting = function(name) {
	return promisifyDb(db.settings.findOne({
		_id: name
	}));
};

database.getSettings = function() {
	return promisifyDb(db.settings.find({}));
};

database.setSetting= function(key, value) {
	return db.settings.update({
		_id: key
	}, value, {
		upsert: true
	});
};

database.writeSetting = function (data) {
	return database.getSetting({
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

database.users = {};

database.users.getUser = function(login) {
	return promisifyDb(db.settings.findOne({
		login: login
	}));
};

/**
 * New user in DB
 * @param {object} user
 * @param {string} user.login
 * @param {string} user.password
 */
database.users.signup = function(user) {
	user.password = bcrypt.hashSync(req.body.password, 10);
	db.users
		.insert(user)
		.then(function(res) {
			req.session.login = user.login;
			return {ok: true};
		})
		.catch(function() {
			return {ok: false, error: 'Username has been taken.', field: 'username'};
		});
};

module.exports = database;