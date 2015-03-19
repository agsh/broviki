/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 18.03.15.
 */

var App = require('./app');

var MainWindow = Backbone.Marionette.LayoutView.extend({
	id: 'main',

	regions: {
		Tabs: '.tab-links'
	},

	events: {
		'dragover': 'preventDefault',
		'drop': 'preventDefault',
		'dragstart': 'preventDefault'
	},

	initialize: function() {
		this.template = 'main hello'; //App.templates.Main;
		this.render();
	},

	render: function() {
		this.$el.html(this.template({}));
	}
});



module.exports = MainWindow;
