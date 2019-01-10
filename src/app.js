const { promisify } = require('util');
const restify = require('restify');
const onvif = require('onvif');

(async function() {
    const result = await promisify(onvif.Discovery.probe)();
    console.log(result);

    function respond(req, res, next) {
        res.send(result.map(cam => cam.hostname));
        next();
    }

    const server = restify.createServer();
    server.get('/hello/:name', respond);
    server.head('/hello/:name', respond);

    server.listen(6408, () => {
        console.log('%s listening at %s', server.name, server.url);
    });

})();


