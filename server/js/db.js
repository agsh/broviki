const Datastore = require('nedb')
	, path = require('path')
	, config = require('../config')
	, bcrypt = require('bcrypt')
	, dataPath = config.dataPath
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

function denodeify(nodeStyleFunction, filter) {
	return function() {
		var self = this;
		var functionArguments = new Array(arguments.length + 1);
		for (var i = 0; i < arguments.length; i += 1) {
			functionArguments[i] = arguments[i];
		}
		function promiseHandler(resolve, reject) {
			function callbackFunction() {
				var args = new Array(arguments.length);
				for (var i = 0; i < args.length; i += 1) {
					args[i] = arguments[i];
				}
				if (filter) {
					args = filter.apply(self, args);
				}
				var error = args[0];
				var result = args[1];
				if (error) {
					return reject(error);
				}
				return resolve(result);
			}
			functionArguments[functionArguments.length - 1] = callbackFunction;
			nodeStyleFunction.apply(self, functionArguments);
		}
		return new Promise(promiseHandler);
	};
}

function promisifyDatastore(datastore) {
	datastore.insert = denodeify(datastore.insert);
	datastore.update = denodeify(datastore.update);
	datastore.remove = denodeify(datastore.remove);
}

promisifyDatastore(db.settings);
promisifyDatastore(db.users);

// This utilizes the exec function on nedb to turn function calls into promises
var promisifyDb = function(obj) {
	return new Promise(function(resolve, reject) {
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

database.users.getUsers = function() {
	return promisifyDb(db.users.find({}));
};

database.users.getUser = function(login) {
	return promisifyDb(db.users.findOne({
		login: login
	}));
};

/**
 * New user in DB
 * @param {object} user
 * @param {string} user.login
 * @param {string} user.password
 */
database.users.add = function(user) {
	return db.users
		.insert(user)
		.then(function(res) {
			return {ok: true};
		})
		.catch(function() {
			return {ok: false, error: 'Username has been taken.', field: 'username'};
		});
};

/**
 * Remove user from database
 * @param {string} login
 */
database.users.remove = function(login) {
	return db.users.remove({login: login});
};

db.users.ensureIndex({ fieldName: 'userName', unique: true }, function (err) {
	if (err) {
		console.error(err);
	}
});

module.exports = database;