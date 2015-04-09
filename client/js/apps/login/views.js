/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, Backbone = require('backbone')
	, templates = require('../../templates')
	;

var Login = Marionette.ItemView.extend({
	template: templates.login
	, model: new Backbone.Model({login: 'login', password: 'password'})
	, events: {
		'click #login-btn': login
		, 'click signup-btn': signup
	}
	, login: function() {
		console.log('login');
	}
	, signup: function() {
		console.log('signup');
	}
});

module.exports = {
	Login: Login
};