/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 21.04.15.
 */

var views = require('./views')
    , Backbone = require('backbone')
    ;

var Controller = {
    showIntro: function() {
	    var intro = new views.Intro();
	    intro.on('navigate', function(where) {
		    this[where](intro.getRegion('content'));
	    }.bind(this));
        App.rootView.window.show(intro);
    }
    , login: function(region) {
        var login = new views.Login();
        region.show(login);
    }
    , signup: function(region) {
        var signup = new views.Signup();
		region.show(signup);
    }
};

module.exports = {
    Controller: Controller
};