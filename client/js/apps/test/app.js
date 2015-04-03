/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, App = require('../../app').App
	, TestController = require('./testController').Controller
	;

var Router = Marionette.AppRouter.extend({
	appRoutes: {
		'test': 'showTest'
	}
});

var Test = {
	showTest: function() {
		// App.execute('set:active:header', 'test');
		TestController.showTest();
	}
};

console.log(App);

App.on('test:test', function() {
	App.navigate('test');
	Test.showTest();
});

App.on('before:start', function(){
	new Router({
		controller: Test
	});
});