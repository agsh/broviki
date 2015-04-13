/**
 * Created by Andrew D.Laptev <a.d.laptev@gmail.com> on 21.03.15.
 */

const assert = require('assert')
	, users = require('../server/js/users')
	, request = require('request').defaults({'json': true})
	, config = require('../server/config')
	, app = require('../server/app')
	, url = 'https://localhost:' + config.port
	;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

before(function(done) {
	app.start(done);
});

describe('Users module', function() {
	describe('Simple test', function() {
		it('should return test response', function(done) {
			request(url + '/api/auth/test', function (error, response, body) {
				assert.ok (!error && response.statusCode === 200);
				assert.equal(body, 'test');
				done();
			})
		});
	});
	describe('New user creation', function() {
		it('should not create a new user if fields is missing', function (done) {
			request.post(url + '/api/auth/signup', function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.equal(body.ok, false);
				done();
			});
		});
		it('should create a new user', function (done) {
			request.post({
				url: url + '/api/auth/signup'
				, body: {
					login: 'login'
					, name: 'name'
					, password: 'password'
				}
			}, function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(body.ok);
				done();
			});
		});
		it('should create existing user', function (done) {
			request.post({
				url: url + '/api/auth/signup'
				, body: {
					login: 'login'
					, name: 'name'
					, password: 'password'
				}
			}, function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(!body.ok);
				done();
			});
		});
	});

	describe('Login', function() {
		it('should fail with unexisting user', function(done) {
			request.post({
				url: url + '/api/auth/login'
				, body: {
					login: 'dumb'
					, password: 'password'
				}
			}, function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(!body.ok);
				done();
			});
		});
		it('should fail with wrong credentials', function(done) {
			request.post({
				url: url + '/api/auth/login'
				, body: {
					login: 'login'
					, password: 'wrong password'
				}
			}, function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(!body.ok);
				done();
			});
		});
		it('should login with proper credentials', function(done) {
			request.post({
				url: url + '/api/auth/login'
				, body: {
					login: 'login'
					, password: 'password'
				}
			}, function (err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(body.ok);
				done();
			});
		});
	});

	describe('Remove user', function() {
		it('should remove user from database', function(done) {
			request.post({
				url: url + '/api/auth/remove'
				, body: { // TODO remove login
					login: 'login'
				}
			}, function(err, res, body) {
				assert.ok(!err && res.statusCode === 200);
				assert.ok(body.ok);
				done();
			});
		});
	});
});