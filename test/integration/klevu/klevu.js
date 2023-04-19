'use strict';

var assert = require('chai').assert;
var request = require('request-promise');
var config = require('../it.config');
var chai = require('chai');
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);

describe('Klevu-GetAPIKeys', function () {
    this.timeout(20000);
    it('Should Fetch API Key', function (done) {
        var cookieJar = request.jar();

        var myRequest = {
            url: '',
            method: 'GET',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        var endPoint = '/Klevu-GetAPIKeys';
        myRequest.url = config.baseUrl + endPoint;

        request(myRequest).then(function (response) {
            assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200.');
            assert.isString(response.body, 'Expected response to be of type string.');
            done();
        });
    });
});

describe('Klevu-GetSearchURL', function () {
    this.timeout(20000);
    it('Should Fetch Search URL', function (done) {
        var cookieJar = request.jar();

        var myRequest = {
            url: '',
            method: 'GET',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        var endPoint = '/Klevu-GetSearchURL';
        myRequest.url = config.baseUrl + endPoint;

        request(myRequest).then(function (response) {
            assert.equal(response.statusCode, 200, 'Expected request statusCode to be 200.');
            assert.isString(response.body, 'Expected response to be of type string.');
            done();
        });
    });
});
