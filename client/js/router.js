/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 23.03.15.
 */

var Backbone = require('backbone')
	, LoginView = require('./views/login').LoginView
	;

var Router = Backbone.Router.extend({
	routes: {
		login: 'login'
	}
	, login: function() {
		this.show(new LoginView({}));
	}
});

exports.Router = Router;
