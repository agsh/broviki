/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette')
	, templates = require('../../templates')
	;

var Test = Marionette.ItemView.extend({
	template: templates.test
});

module.exports.Test = Test;
