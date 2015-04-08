/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, App = require('../../app').App
	, Controller = require('./controller').Controller
	;

App.on('login:login', function() {
	App.navigate('login');
	Controller.showLogin();
});

App.on('login:signup', function() {
	App.navigate('signup');
	Controller.showSignup();
});

App.on('before:start', function(){
	new Marionette.AppRouter({
		controller: Controller
		, appRoutes: {
			login: 'showLogin'
			, signup: 'showSignup'
		}
	});
});