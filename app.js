let http = require('http');
let fs = require('fs');
let request = require('request');
let gollumBase = 'http://wiki.cb6bb44b5dbf0442f86b290c4b6b47cf5.cn-beijing.alicontainer.com';
//let getGollumUrl = url => `http://localhost:9000${url}`;
let getGollumUrl = url => `${gollumBase}${url}`;

let checkAuth = req => {
  return true;
};

let decode = str => {
  let map = {};
  str.split('&').forEach(function(pattern) {
    let matches = pattern.split('=');
    map[matches[0]] = decodeURIComponent(matches[1]);
  });
  return map;
};

let encode = map => {
  let matches = Object.keys(map).map(key => [key, encodeURIComponent(map[key])].join('='));
  let str = matches.join('&');
  return str;
};

let pipeResponse = function (stream, res) {
  stream = stream.on('response', function(response) {
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

let server = http.createServer(function(req, res) {
    let {url, method, headers} = req;
    if (!checkAuth(req)) {
      return;
    }
    
    let gollumUrl = getGollumUrl(url);

    pipeResponse(req.pipe(request[method.toLowerCase()](gollumUrl)), res);
});

module.exports = function (options = {}) {
  if (options.checkAuth) {
    checkAuth = options.checkAuth;
  }
  options.port = options.port || 8000;
  server.listen(options.port, function () {
      console.log('gollum-auth-shell started on http://localhost:${options.port}; press ctrl-c to terminate.')
  });
};
