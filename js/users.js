/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 18.03.15.
 */

const database = require('./db')
	, bcrypt = require('bcrypt')
	, config = require('./../config')
	;

db.users.ensureIndex({ fieldName: 'userName', unique: true }, function (err) {
	if (err) {
		console.error(err);
	}
});

module.exports = function(app) {
	app.post('/auth/login', login);
	app.post('/auth/signup', signup);
	app.post('/auth/logout', function(req, res){
		req.session.destroy(function(err) {
			res.json(err ? {ok: false, err: err.toString()} : { ok: true });
		});
	});

// POST /api/auth/remove_account
// @desc: deletes a user
	app.post("/api/auth/remove_account", function(req, res){
		db.run("DELETE FROM users WHERE id = ? AND auth_token = ?", [ req.signedCookies.user_id, req.signedCookies.auth_token ], function(err, rows){
			if(err){
				res.json({ error: "Error while trying to delete user." });
			} else {
				res.clearCookie('user_id');
				res.clearCookie('auth_token');
				res.json({ success: "User successfully deleted." });
			}
		});
	});
};

function auth(req, res) {
	db.users.findOne({_id: req.signedCookies.user_id, authToken: req.signedCookies.auth_token}, function(err, user) {
		if (user) {
			res.json({ user: _.omit(user, ['password', 'auth_token']) });
		} else {
			res.json({ error: 'Client has no valid login cookies.'  });
		}
	});
}

function login(req, res){
	db.get("SELECT * FROM users WHERE username = ?", [ req.body.username ], function(err, user){
		if(user){

			// Compare the POSTed password with the encrypted db password
			if( bcrypt.compareSync( req.body.password, user.password)){
				res.cookie('user_id', user.id, { signed: true, maxAge: config.cookieMaxAge });
				res.cookie('auth_token', user.auth_token, { signed: true, maxAge: config.cookieMaxAge });

				// Correct credentials, return the user object
				res.json({ user: _.omit(user, ['password', 'auth_token']) });

			} else {
				// Username did not match password given
				res.json({ error: "Invalid username or password."  });
			}
		} else {
			// Could not find the username
			res.json({ error: "Username does not exist."  });
		}
	});
}

function signup(req, res) {
	database.users.signup({
		login: req.body.login
		, name: req.body.name
		, password: req.body.password
	}.then(res.send));
}

