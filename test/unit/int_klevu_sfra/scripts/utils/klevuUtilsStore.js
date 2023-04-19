'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var SiteMock = require('../../../../mocks/dw/system/Site');
var ProductMgrMock = require('../../../../mocks/dw/catalog/ProductMgr');

var Logger = {
    debug: function () {},
    error: function () {}
};

var LogUtils = {
    getLogger: function () {
        return Logger;
    }
};

describe('klevuUtilsStore', function () {
    var klevuUtilsStore = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/scripts/utils/klevuUtilsStore.js', {
        'dw/system/Site': SiteMock,
        'dw/catalog/ProductMgr': ProductMgrMock,
        '*/cartridge/scripts/utils/klevuLogUtils': LogUtils
    });

    describe('#site preference config', function () {
        it('should return config values', function () {
            var result = klevuUtilsStore.config;
            assert.isObject(result, 'config returned is an object');
        });
    });
});
