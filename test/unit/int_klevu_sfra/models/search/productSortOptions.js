'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var collections = require('../../../../mocks/util/collections');
var urlHelpersMock = require('../../../../mocks/helpers/urlHelpers');


urlHelpersMock = urlHelpersMock.appendQueryParams();
var collectionsMock = collections.map();

var klevuUtils = {
    config: {
        enableKlevuStorefront: true,
        enableKlevuCategoryPage: true
    },
    appendQueryParam: function () {
        return {};
    }
};

function MockProductSortOptions() {
    this.options = { id: 'best-matches' };
    return this;
}

describe('#getSortingOptions()', function () {
    var pagingModel = {};
    var sortingOptions = {
        optionID: ['best-matches', 'high-to-low', 'low-to-high']
    };
    var productSearch = {
        category: {
            parent: {
                ID: 'women'
            }
        }
    };

    var sortOptions = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/models/search/productSortOptions.js', {
        '*/cartridge/scripts/helpers/urlHelpers': urlHelpersMock,
        '*/cartridge/scripts/util/collections': collectionsMock,
        '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
    });

    sortOptions = {
        productSortOptions: function () {
            return {
                displayName: 'best-matches',
                id: '123',
                url: 'some url'
            };
        }
    };

    it('should return sorting options', function () {
        var result = sortOptions.productSortOptions(productSearch, sortingOptions, pagingModel);
        assert.isObject(result, sortOptions);
    });
});

describe('#ProductSortOptionsScript', () => {
    var productSearch = {};
    var pagingModel = {};
    var sortingOptions = {
        productType: 'someProductType',
        optionModel: {},
        quantity: 1,
        variationModel: {},
        promotions: [],
        variables: [],
        lineItem: {
            UUID: '123'
        }
    };

    var sortOptions;
    before(function () {
        module.__proto__.superModule = MockProductSortOptions; // eslint-disable-line no-proto

        sortOptions = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/models/search/productSortOptions', {
            '*/cartridge/scripts/util/collections': collectionsMock,
            '*/cartridge/scripts/helpers/urlHelpers': urlHelpersMock,
            '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
        });

        sortOptions = {
            productSortOptions: function () {
                return {
                    displayName: 'best-matches',
                    id: '123',
                    url: 'some url'
                };
            }
        };
    });


    it('should set sort options when enableKlevuStorefront is true', function () {
        var result = sortOptions.productSortOptions(productSearch, sortingOptions, pagingModel);
        assert.isObject(result, {});
    });

    sortOptions = {
        productSortOptions: function () {
            return null;
        }
    };
    it('should not set sort options when enableKlevuStorefront is false', function () {
        klevuUtils.config.enableKlevuStorefront = false;
        var result = sortOptions.productSortOptions(productSearch, sortingOptions, pagingModel);
        assert.isObject(result, null);
    });
});
