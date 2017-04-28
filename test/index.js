/**
 * Created on 2017/4/20.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
'use strict';
const http = require('http');
const request = require('request');
const faker = require('faker');
const assert = require('chai').assert;

const proxy = require('../app');

describe('gollum-auth-shell', function () {
    const methods = ['post', 'get', 'put', 'delete'];
    const port = 65531, proxyUrl = `http://localhost:${port}`;
    let proxyServer;
    let mockServer, mockPort = 65532, mockUrl = `http://localhost:${mockPort}`;
    before('initialize mock server:', function (done) {
        mockServer = http.createServer(function (req, res) {
            let {url, method} = req;
            res.end(`${method.toUpperCase()} - ${url}`);
        });
        mockServer.listen(mockPort, done);
    });
    before('initialize proxy server:', function (done) {
        proxyServer = proxy({
            port,
            gollumBase: mockUrl,
            onReady: done,
            middlewares: [
                function ({url, method, headers}, res, next) {
                    method = method.toLowerCase();
                    if (!new RegExp(method).test(url)) {
                        return res.end(JSON.stringify({message: 'request method not match.'}));
                        //throw new Error('request method not match.');
                    }
                    next();
                }
            ]
            //checkAuth: function ({url, method, headers}) {
            //    method = method.toLowerCase();
            //    if (!new RegExp(method).test(url)) {
            //        throw new Error('request method not match.');
            //    }
            //}
        });
    });

    after((done) => proxyServer.close(done));
    after((done) => mockServer.close(done));

    it('获得与路径匹配的响应', function (done) {
        let method = faker.random.arrayElement(methods), url = `/${method}`;
        request[method](`${proxyUrl}${url}`, function (err, response, body) {
            assert.equal(body, `${method.toUpperCase()} - ${url}`);
            done();
        });
    });

    it('权限认证失败时获得异常', function (done) {
        let indexArr = [0, 1, 2, 3];
        let index1 = faker.random.arrayElement(indexArr);
        indexArr.splice(indexArr.indexOf(index1), 1);
        let index2 = faker.random.arrayElement(indexArr);

        let method = methods[index1], url = `/${methods[index2]}`;
        request[method](`${proxyUrl}${url}`, function (err, response, body) {
            assert.equal(JSON.parse(body).message, 'request method not match.');
            done();
        });
    });
});
