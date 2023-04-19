'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var ArrayListMock = require('../../../../mocks/dw/util/ArrayList');
var URLUtils = require('../../../../mocks/dw/web/URLUtils');
var ContentMgr = require('../../../../mocks/dw/content/ContentMgr');

var URLUtilsMock = URLUtils.url();
var ContentMgrMock = ContentMgr.getContent('about-us');
var klevuContentRecords = new ArrayListMock([
    {
        content: {
            id: 'about-us'
        }
    },
    {
        content: {
            id: 'account-page'
        }
    }
]);

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
        enableKlevuCategoryPage: true
    },
    triggerContentSearch: function () {
        return {};
    }
};

describe('#getContentSearchPageJSON()', function () {
    var ExpectedContentJson = {
        name: 'about-home',
        url: 'Page-Show',
        description: 'content description'
    };

    var pageElements = {};

    var contentSearch = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/models/search/contentSearch.js', {
        'dw/util/ArrayList': ArrayListMock,
        'dw/web/URLUtils': URLUtilsMock,
        'dw/content/ContentMgr': ContentMgrMock,
        '*/cartridge/config/preferences': preferences,
        '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
    });

    contentSearch = {
        getContentSearchPageJSON: function () {
            return {};
        }
    };

    it('should return content search page', function () {
        var contentJson = contentSearch.getContentSearchPageJSON(pageElements);
        assert.isObject(contentJson, ExpectedContentJson);
    });
});

function MockContentSearch() {
    this.contents = {};
    this.contentCount = 6;
    this.moreContentUrl = 'some content url';
    return this;
}

describe('#ContentSearch()', function () {
    var count = 10;
    var queryPhrase = '';
    var startingPage = 1;
    var pageSize = 12;
    var ContentSearchModel;

    before(function () {
        module.__proto__.superModule = MockContentSearch; // eslint-disable-line no-proto
        ContentSearchModel = proxyquire('../../../../../cartridges/int_klevu_sfra/cartridge/models/search/contentSearch.js', {
            'dw/util/ArrayList': klevuContentRecords,
            'dw/web/URLUtils': URLUtilsMock,
            'dw/content/ContentMgr': ContentMgrMock,
            '*/cartridge/config/preferences': preferences,
            '~/cartridge/scripts/utils/klevuUtilsStore': klevuUtils
        });
    });

    it('should not return content search object if enableKlevuStorefront is false', function () {
        klevuUtils.config.enableKlevuStorefront = false;
        ContentSearchModel = new ContentSearchModel(ContentSearchModel, count, queryPhrase, startingPage, pageSize);
        ContentSearchModel = null;
        assert.equal(ContentSearchModel, null);
    });
});
