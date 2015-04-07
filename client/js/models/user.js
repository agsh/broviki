/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 07.04.15.
 */

var User = Backbone.Model.extend({
	initialize: function(){
		_.bindAll(this);
	}
	, defaults: {
		id: 0
		, login: ''
		, name: ''
	}
	, url: '/api/auth/user'
});