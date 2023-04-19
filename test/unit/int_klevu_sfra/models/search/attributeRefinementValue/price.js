'use strict';
/* eslint no-proto: 0*/

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

function PriceMock() {
    this.url = 'some url';
    return this;
}

describe('#PriceRefinementValueWrapper()', function () {
    var klevuUtils = {
        config: {
            enableKlevuStorefront: true,
            enableKlevuCategoryPage: true
        },
        appendQueryParam: function () {
            return 'appended url';
        }
    };
    var productSearch = {
        category: {
            parent: {
                ID: 'women'
            }
        }
    };

    var PriceModel;
    var refinementDefinition = {};
    var refinementValue = {};
    before(function () {
        module.__proto__.superModule = PriceMock;
        PriceModel = proxyquire('../../../../../../cartridges/int_klevu_sfra/cartridge/models/search/attributeRefinementValue/price.js', {
            '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
        });
    });

    it('should append query param in price refinements when enableKlevuStorefront is true', function () {
        var result = new PriceModel(productSearch, refinementDefinition, refinementValue);
        assert.isObject(result, 'some url');
    });

    it('should append query param in price refinements when enableKlevuStorefront is true', function () {
        klevuUtils.config.enableKlevuStorefront = false;
        var result = new PriceModel(productSearch, refinementDefinition, refinementValue);
        assert.isObject(result, null);
    });
});
