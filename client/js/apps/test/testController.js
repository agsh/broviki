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

		view.on('login:show', function() {
			alert('controller show');
			App.trigger('intro:intro');
		});
	}
};

module.exports.Controller = Controller;