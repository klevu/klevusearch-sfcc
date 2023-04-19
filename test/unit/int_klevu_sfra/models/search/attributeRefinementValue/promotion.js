'use strict';

/* eslint no-proto: 0*/


var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

function PromotionMock() {
    this.url = 'some url';
    return this;
}

describe('#PromotionRefinementValueWrapper()', function () {
    var productSearch = {
        category: {
            parent: {
                ID: 'women'
            }
        }
    };

    var klevuUtils = {
        config: {
            enableKlevuStorefront: true,
            enableKlevuCategoryPage: true
        },
        appendQueryParam: function () {
            return '';
        }
    };
    var PromotionModel;
    var refinementDefinition = {};
    var refinementValue = {};
    before(function () {
        module.__proto__.superModule = PromotionMock;
        PromotionModel = proxyquire('../../../../../../cartridges/int_klevu_sfra/cartridge/models/search/attributeRefinementValue/promotion.js', {
            '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
        });
    });

    it('should append query param in promotion refinements when enableKlevuStorefront is true', function () {
        var result = new PromotionModel(productSearch, refinementDefinition, refinementValue);
        assert.isObject(result, 'some url');
    });

    it('should append query param in promotion refinements when enableKlevuStorefront is true', function () {
        klevuUtils.config.enableKlevuStorefront = false;
        var result = new PromotionModel(productSearch, refinementDefinition, refinementValue);
        assert.isObject(result, null);
    });
});
