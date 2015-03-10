(function (App) {
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
			this.template = App.templates.Main;
			this.render();
		},

		render: function() {
			this.$el.html(this.template({}));
		}
	});


	App.View.MainWindow = MainWindow;
})(window.App);