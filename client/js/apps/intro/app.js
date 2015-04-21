/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 21.04.15.
 */

var Marionette = require('backbone.marionette')
    , App = require('../../app').App
    , Controller = require('./controller').Controller
    ;

App.on('intro:intro', function() {
    App.navigate('intro');
    Controller.showIntro();
});

App.on('intro:login', function() {
    App.navigate('login');
    Controller.showSignup();
});

App.on('intro:signup', function() {
    App.navigate('signup');
    Controller.showSignup();
});

App.on('before:start', function(){
    new Marionette.AppRouter({
        controller: Controller
        , appRoutes: {
            intro: 'showIntro'
            , login: 'showLogin'
            , signup: 'showSignup'
        }
    });
});