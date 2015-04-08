/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, templates = require('../../templates')
	;

var Test = Marionette.ItemView.extend({
	template: templates.test
	, events: {
		'click button.login': 'loginClick'
	}
	, loginClick: function() {
		alert('login');
		this.trigger('login:show');
	}
});

module.exports.Test = Test;
