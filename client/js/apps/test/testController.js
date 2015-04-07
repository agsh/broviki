/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var TestView = require('./testView').Test
	, App = require('../../app').App
	;

var Controller = {
	showTest: function() {
		var view = new TestView();
		App.rootView.window.show(view);
	}
};

module.exports.Controller = Controller;