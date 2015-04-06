/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 03.04.15.
 */

var Marionette = require('backbone.marionette');

var Test = Marionette.ItemView.extend({
	template: '#test'
});

module.exports.Test = Test;
