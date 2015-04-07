/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 07.04.15.
 */

var views = require('./views');

var Controller = {
	showLogin: function() {
		var view = new views.Login;
		App.rootView.window.show(view);
	}
};

module.exports.Controller = Controller;