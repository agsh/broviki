/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 17.03.15.
 */
const PORT = 6900;

const express = require('express')
	, app = express()
	, serveStatic = require('serve-static')
	, session = require('express-session')
	, NedbStore = require('connect-nedb-session')(session)
	;

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

app.use(function(req, res, next) {
	console.log(req.login || 'empty');
	next();
});

app.use(serveStatic(__dirname + '/client'));
app.use('/node_modules/', serveStatic(__dirname + '/node_modules/'));

app.listen(PORT);