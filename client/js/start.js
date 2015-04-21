/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 18.03.15.
 */

var App = require('./app').App
	, i18n = require('i18next');

var resources = {
	ru: require('../i18n/ru')
	, en: { translation: { 'key': 'value' } }
};

i18n.init({ lng: 'ru', resStore: resources });

App.start();