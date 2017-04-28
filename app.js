const http = require('http');
const request = require('request');
let gollumBase = '';
//let getGollumUrl = url => `http://localhost:9000${url}`;
let getGollumUrl = url => `${gollumBase}${url}`;

let checkAuth = () => true, debugOn;

let log = {
    debug: (...args) => debugOn && console.log(...args)
};

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

let _server;

let createServer = () =>
    _server = http.createServer(function (req, res) {
        let currentIndex = 0;
        log.debug(req.method, req.url);
        log.debug('middlewares:', middlewares.length);
        log.debug(middlewares);
        let next = () => {
            if (!middlewares[currentIndex]) {
                return;
            }

            let middleware = middlewares[currentIndex++];
            if (debugOn) {
                try {
                    log.debug('calling into middleware currentIndex...');
                    middleware(req, res, next);
                } catch (e) {
                    console.error(e.stack || e);
                }
            } else {
                middleware(req, res, next);
            }
        };

        next();
    });

let getServer = () => _server || createServer();

let setServer = server => _server = server || createServer();

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

let checkMiddlewares = middlewares => middlewares.forEach(middleware => {
    if (typeof middleware !== 'function') {
        throw new TypeError('`options.middlewares` should be an array of function.');
    }
});

let createProxy = function (options = {}) {
    debugOn = options.debug;

    log.debug(options);

    setServer(options.server);

    options.addMiddlewares = options.addMiddlewares ||
                            (_middlewares => middlewares.push(..._middlewares));

    if (options.checkAuth) {
        checkAuth = wrapAuthChecker(options.checkAuth);
        options.middlewares = [checkAuth, ...options.middlewares];
    }

    checkMiddlewares(options.middlewares);

    options.addMiddlewares([
        ...(options.middlewares || []),
        proxyResponse
    ]);

    gollumBase = options.gollumBase;
    options.port = options.port || 8000;

    getServer().listen(options.port, function () {
        options.onReady && options.onReady();
    });
    return getServer();
};

module.exports = createProxy;