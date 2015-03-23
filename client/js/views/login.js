/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 23.03.15.
 */

var LoginView = Backbone.View.extend({
	initialize: function () {
		_.bindAll(this);
	}
	, render: function() {

	}
	, events: {
		'click #login-btn': 'onLoginAttempt'
		, 'click #signup-btn': 'onSignupAttempt'
	}
});

exports.LoginView = LoginView;