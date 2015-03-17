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
	if (!req.login) {
		res.render('')
	} else {
		next();
	}
});

app.listen(PORT);