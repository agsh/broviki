/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 21.04.15.
 */

var Marionette = require('backbone.marionette')
    , Backbone = require('backbone')
    , templates = require('../../templates')
    , User = require('../../models/user')
    ;

var Intro = Marionette.ItemView.extend({
    template: templates.header
});

var Login = Marionette.ItemView.extend({
    template: templates.login
    , model: new User()
    , events: {
        'click #login-btn': 'login'
    }
    , login: function() {
        console.log('login');
    }
});

var Signup = Marionette.ItemView.extend({
    template: templates.signup
    , model: new User()
    , events: {
        'click #signup-btn': 'signup'
    }
    , signup: function() {
        console.log('signup');
    }
});

var Header = Marionette.ItemView.extend({

});

module.exports = {
    Login: Login
    , Signup: Signup
    , Header: Header
};