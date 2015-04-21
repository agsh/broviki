/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 21.04.15.
 */

var views = require('./views')
    , Backbone = require('backbone')
    ;

var Controller = {
    intro: new views.Intro()
    , showIntro: function() {
        App.rootView.window.show(this.intro);
    }
    , showLogin: function() {
        var login = new views.Login();
        App.rootView.window.show(login);
    }
    , showSignup: function() {
        var signup = new views.Signup();
        App.rootView.window.show(signup);
    }
};

module.exports = {
    Controller: Controller
};