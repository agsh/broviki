/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 21.04.15.
 */

var views = require('./views');

var Controller = {
    showIntro: function() {
        var intro = new views.Intro();
        App.rootView.window.show(intro);
    }
    , showHeader: function() {
        var header = new views.Header();
        App.rootView.header.show(header);
    }
    , showLogin: function() {
        var login = new views.Login();
        App.rootView.window.show(login);
    }
    , showSignup: function() {}
};

module.exports = {
    Controller: Controller
};