'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var collections = require('../../../../mocks/util/collections');
var CatalogMgr = require('../../../../mocks/dw/catalog/CatalogMgr');
var ProductSearchModel = require('../../../../mocks/dw/catalog/ProductSearchModel');
var ArrayListMock = require('../../../../mocks/dw/util/ArrayList');


function MockProductSearch() {
    this.category = { id: 'new-arrivals' };
    return this;
}

var collectionsMock = collections.map();
var preferences = {
    maxOrderQty: 10,
    defaultPageSize: 12,
    plpBackButtonOn: true,
    plpBackButtonLimit: 10,
    minTermLength: 1
};


var klevuUtils = {
    config: {
        enableKlevuStorefront: true,
        enableKlevuCategoryPage: true,
        defaultSortingRule: ''
    },
    getAllSearchResults: function () {
        return {};
    }
};

describe('#ProductSearchModel', () => {
    describe('ProductSearch', () => {
        var httpParams = {};
        var apiProductSearch = {};
        var ProductSearch;
        var rootCategory = 'root';
        var refinements = {};
        var klevuProducts = ['1234', '334', '5678'];
        var klevuProductsCount = 3;
        var sortingOptions = {};

        beforeEach(function () {
            module.__proto__.superModule = MockProductSearch; // eslint-disable-line no-proto

            ProductSearch = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/models/search/productSearch', {
                '*/cartridge/scripts/util/collections': collectionsMock,
                'dw/util/ArrayList': ArrayListMock,
                'dw/catalog/CatalogMgr': CatalogMgr,
                'dw/catalog/ProductSearchModel': ProductSearchModel,
                '*/cartridge/config/preferences': preferences,
                '~/cartridge/scripts/utils/klevuUtilsStore': {
                    getAllSearchResults: function () {
                        return {};
                    },
                    config: {
                        enableKlevuStorefront: true,
                        enableKlevuCategoryPage: true,
                        defaultSortingRule: ''
                    }
                }
            });
        });

        afterEach(function () {
            klevuUtils.config.enableKlevuStorefront = true;
        });
        global.request = {
            httpParameterMap: {
                q: {
                    value: 'women'
                }
            },
            httpPath: {
                indexOf: function () {
                    return {};
                }
            }
        };

        it('should get klevu products for search results when enableKlevuStorefront is true', function () {
            ProductSearch = new ProductSearch(apiProductSearch, httpParams, 'sorting-rule-1', sortingOptions,
                            rootCategory, refinements, klevuProducts, klevuProductsCount);
            assert.isObject(ProductSearch, {});
        });

        it('should not get klevu products for search results when enableKlevuStorefront is false', function () {
            klevuUtils.config.enableKlevuStorefront = false;
            ProductSearch = new ProductSearch(apiProductSearch, httpParams, 'sorting-rule-1', sortingOptions,
                            rootCategory, refinements, klevuProducts, klevuProductsCount);
            ProductSearch = null;
            assert.equal(ProductSearch, null);
        });
    });
});
