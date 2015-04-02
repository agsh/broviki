/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 17.03.15.
 */
const
	config = require('./config')
	, express = require('express')
	, https = require('https')
	, app = express()
	, bodyParser = require('body-parser')
	, serveStatic = require('serve-static')
	, session = require('express-session')
	, path = require('path')
	, fs = require('fs')
	, NedbStore = require('connect-nedb-session')(session)
	;

app.set('view engine', 'jade');

app.use(session({
	secret: 'broviki'
	, resave: false
	, saveUninitialized: true
	, cookie: {
		path: '/'
		, secure: true
		, maxAge: 5 * 24 * 3600 * 1000
	}
	, store: new NedbStore({ filename: __dirname + '/db/sessions.db' })
}));

app.use(bodyParser.json());

require('./js/users')(app); // users api

/*
app.use(function(req, res, next) {
	/!*if (!req.session.login) {
		res.render('login');
	} else {
		next();
	}*!/
});
*/


app.use(serveStatic(__dirname + '/../dist'));
app.use('/node_modules/', serveStatic(__dirname + '/../node_modules/'));

exports.start = function(callback) {
	https.createServer({
		key: fs.readFileSync('./tls/key.pem'),
		cert: fs.readFileSync('./tls/cert.pem')
	}, app).listen(config.port, callback);
};

if (path.basename(process.argv[1]) === 'app.js') {
	exports.start(function() {
		console.log('started');
	});
}