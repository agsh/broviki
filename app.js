/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 17.03.15.
 */
const PORT = 6900;

const express = require('express')
	, app = express()
	, serveStatic = require('serve-static')
	, session = require('express-session')
	, NedbStore = require('connect-nedb-session')(session)
	, db = require('./js/db')
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

app.use(serveStatic(__dirname + '/dist'));
app.use('/node_modules/', serveStatic(__dirname + '/node_modules/'));

app.use(function(req, res, next) {
	if (!req.session.login) {
		res.json({ error: 'Client has no valid login cookies.' });
	} else {
		next();
	}
});

// require('./js/users')(app);

app.listen(PORT);