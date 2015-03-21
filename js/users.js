/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 18.03.15.
 */

const database = require('./db')
	, bcrypt = require('bcrypt')
	, config = require('./../config')
	;

module.exports = function(app) {
	app.get('/api/auth/test', function(req, res) {res.send('test');});
	app.post('/api/auth/login', login);
	app.post('/api/auth/signup', signup);
	app.post('/api/auth/logout', function(req, res){
		req.session.destroy(function(err) {
			res.json(err ? {ok: false, err: err.toString()} : { ok: true });
		});
	});
	app.post('/api/auth/remove', remove);
};

function login(req, res) {
	if (!['login', 'password'].every(function(field){ return req.body[field];})) {
		res.send({ok: false, error: 'empty fields'});
	}
	database.users.getUser(req.body.login).then(function(user) {
		if (!user) {
			return res.send({ok: false, error: 'User doesn\'t exists'});
		}
		if (bcrypt.compareSync(req.body.password, user.password)) {
			req.session.login = req.body.login;
			res.send({ok: true});
		} else {
			res.send({ok: false, error: 'Wrong password'});
		}
	});
}

function signup(req, res) {
	if (!['login', 'name', 'password'].every(function(field){ return req.body[field];})) {
		res.send({ok: false, error: 'empty fields'});
	} else {
		database.users.add({
			login: req.body.login
			, name: req.body.name
			, password: bcrypt.hashSync(req.body.password, 10)
		}).then(function(r) {
			res.send(r);
		});
	}
}

function remove(req, res) {
	// TODO get login from session
	database.users.remove(req.body.login)
		.then(function() {
			res.send({ok: true});
		}).catch(function() {
			res.send({ok: false});
		});
}