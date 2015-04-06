/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, App = require('../../app').App
	;

var Login = {
	showLogin: function() {}
	, showSignup: function() {}
};

console.log(App);

App.on('login:login', function() {
	App.navigate('login');
	Login.showLogin();
});

App.on('login:signup', function() {
	App.navigate('signup');
	Login.showSignup();
});

App.on('before:start', function(){
	new Marionette.AppRouter({
		controller: Login
		, appRoutes: {
			login: 'showLogin'
			, signup: 'showSignup'
		}
	});
});