const http = require('http');
const request = require('request');
let gollumBase = '';
//let getGollumUrl = url => `http://localhost:9000${url}`;
let getGollumUrl = url => `${gollumBase}${url}`;

let checkAuth = () => true;

let pipeResponse = function (stream, res) {
    stream = stream.on('response', function (response) {
        let {statusCode} = response;
        if (statusCode >= 300 && statusCode < 400) {
            let {location} = response.headers;
            if (location) {
                response.headers.location = location.replace(gollumBase, '');
                res.writeHead(response.statusCode, response.headers);
            }
        }
    });
    stream.pipe(res);
};

let middlewares = [];

let server = http.createServer(function (req, res) {
    let currentIndex = 0;
    let next = () => {
        if (!middlewares[currentIndex]) {
            return;
        }
        middlewares[currentIndex++](req, res, next);
    };

    next();
});

let wrapAuthChecker = function (checkAuth) {
    return function (req, res, next) {
        try {
            checkAuth(req, res);
        } catch (e) {
            return res.end(JSON.stringify({
                error: e.error || e.message,
                message: e.message,
                name: e.name,
                detail: e.details,
                errorType: e.errorType
            }));
        }
        next();
    };
};

let proxyResponse = function (req, res, next) {
    let gollumUrl = getGollumUrl(req.url);

    pipeResponse(req.pipe(request[req.method.toLowerCase()](gollumUrl)), res);
};

module.exports = function (options = {}) {
    if (options.checkAuth) {
        checkAuth = wrapAuthChecker(options.checkAuth);
        options.middlewares = [checkAuth, ...options.middlewares];
    }
    middlewares = [
        ...(options.middlewares || []),
        proxyResponse
    ];

    gollumBase = options.gollumBase;
    options.port = options.port || 8000;
    server.listen(options.port, function () {
        options.onReady && options.onReady();
        console.log(`gollum-auth-shell started on http://localhost:${options.port}; press ctrl-c to terminate.`);
    });
    return server;
};
