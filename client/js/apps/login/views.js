/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, templates = require('')
	;

var Login = Marionette.ItemView.extend({
	template: login
});

module.exports = {
	Login: Login
};