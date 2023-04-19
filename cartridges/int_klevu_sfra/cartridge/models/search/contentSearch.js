'use strict';

/* global request */

var base = module.superModule;
var ArrayList = require('dw/util/ArrayList');
var URLUtils = require('dw/web/URLUtils');
var ContentMgr = require('dw/content/ContentMgr');
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
var preferences = require('*/cartridge/config/preferences');
var ACTION_ENDPOINT_GRID = 'Search-Content';
var ACTION_ENDPOINT_CONTENT = 'Page-Show';
var DEFAULT_PAGE_SIZE = preferences.defaultPageSize ? preferences.defaultPageSize : 12;

/**
 * Transforms a page of content into an array of JSON objects
 * @param {dw.util.Iterator} pageElements - PagingModel page of content
 * @return {Array} - page of content JSON objects
 */
function getContentSearchPageJSON(pageElements) {
    var contentJson = [];

    while (pageElements.hasNext()) {
        var klevuRecord = pageElements.next();
        var contentAsset = ContentMgr.getContent(klevuRecord.id.replace('cms-', ''));

        if (contentAsset && contentAsset.online) {
            contentJson.push({
                name: contentAsset.name,
                url: URLUtils.url(ACTION_ENDPOINT_CONTENT, 'cid', contentAsset.ID),
                description: contentAsset.description
            });
        }
    }
    return contentJson;
}

/**
 * @constructor
 * @classdesc ContentSearch class
 * @param {dw.util.Iterator<dw.content.Content>} contentSearchResult - content iterator
 * @param {number} count - number of contents in the results
 * @param {string} queryPhrase - request queryPhrase
 * @param {string} startingPage - The index for the start of the content page
 * @param {number | null} pageSize - The index for the start of the content page
 *
 */
function ContentSearch(contentSearchResult, count, queryPhrase, startingPage, pageSize) {
    base.call(this, contentSearchResult, count, queryPhrase, startingPage, pageSize);

    //Only for Search result page
    if (klevuUtils.isKlevuPreserveInUseForSRLP()) {
        var ps = pageSize == null ? DEFAULT_PAGE_SIZE : pageSize;
        var result = klevuUtils.triggerContentSearch(queryPhrase, ps, parseInt(startingPage, 10), request.httpParameterMap.searchType.value);

        if (result) {
            var klevuContentCount = result.queryResults[0].meta.totalResultsFound;
            var klevuContentRecords = result.queryResults[0].records;
            var contentList = new ArrayList(klevuContentRecords).iterator();
            var contents = getContentSearchPageJSON(contentList);
            var moreContentUrl = klevuContentCount > (parseInt(startingPage, 10) + klevuContentRecords.length)
                ? URLUtils.url(ACTION_ENDPOINT_GRID, 'q', queryPhrase,
                    'startingPage', (parseInt(startingPage, 10) + klevuContentRecords.length),
                    'searchType', result.queryResults[0].meta.typeOfSearch)
                : null;

            this.contents = contents;
            this.contentCount = count;
            this.moreContentUrl = moreContentUrl;
        } else {
            this.contents = [];
            this.contentCount = 0;
            this.moreContentUrl = null;
        }
    }
}

module.exports = ContentSearch;
