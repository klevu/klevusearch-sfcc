'use strict';
/* eslint no-proto: 0*/

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

describe('#getUrl()', function () {
    var productSearchModel = {
        urlRefineCategory: function () {
            return '';
        }
    };
    var actionEndpoint = 'Search-KlevuShowAjax';
    var id = '';

    it('should refine category when category selected', function () {
        var url = productSearchModel.urlRefineCategory(actionEndpoint, id);
        assert.equal(url, '');
    });

    it('should refine when category is not selected and its false', function () {
        var url = productSearchModel.urlRefineCategory(actionEndpoint, id);
        assert.equal(url, '');
    });
});

function CategoryMock() {
    this.url = 'some url';
    return this;
}

describe('#CategoryRefinementValueWrapper()', function () {
    var ACTION_ENDPOINT = 'Search-KlevuShowAjax';
    var selected = true;
    var id = '';
    var value = '';
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
    before(function () {
        module.__proto__.superModule = CategoryMock;
        proxyquire('../../../../../../cartridges/int_klevu_sfra/cartridge/models/search/attributeRefinementValue/Category.js', {
            '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
        });
    });

    it('should append query param in category refinements when enableKlevuStorefront is true', function () {
        var result = klevuUtils.appendQueryParam(productSearch, ACTION_ENDPOINT, id, value, selected);
        assert.equal(result, '');
    });
    it('should append query param in category refinements when enableKlevuStorefront is true', function () {
        klevuUtils.config.enableKlevuStorefront = false;
        var result = klevuUtils.appendQueryParam(productSearch, ACTION_ENDPOINT, id, value, selected);
        result = null;
        assert.equal(result, null);
    });
});
