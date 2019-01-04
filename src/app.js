const restify = require('restify');

function respond(req, res, next) {
    res.send(['asd','sdf','eeee', 'Ася - повелительница швабры']);
    next();
}

const server = restify.createServer();
server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.listen(6408, () => {
    console.log('%s listening at %s', server.name, server.url);
});
