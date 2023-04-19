'use strict';

/* global request */

var Site = require('dw/system/Site');
var ProductMgr = require('dw/catalog/ProductMgr');

const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuUtilsStore');
var klevuUtils = {};

/**
 * Calls Klevu search API and fetches results for PLP
 * @param {string} query - search term or category ID
 * @param {boolean} isCategorySearch - true if this is category search
 * @param {string} searchType - the last search type for paginated searches
 * @param {number} offset - the offset for fetching paginated results
 * @returns {Object} response - response object
 */
klevuUtils.triggerSearchAPI = function (query, isCategorySearch, searchType, offset) {
    var klevuHttpServiceInit = require('*/cartridge/scripts/service/klevuHttpServiceInit');
    var requestBody;
    if (isCategorySearch && query !== this.config.root) {
        var CatalogMgr = require('dw/catalog/CatalogMgr');
        var category = CatalogMgr.getCategory(query);
        var categoryPath = category.displayName;
        var parentCategory = category.parent;
        var parentCategoryID = parentCategory ? parentCategory.ID : null;

        while (parentCategoryID && (parentCategoryID !== this.config.root)) {
            categoryPath = parentCategory.displayName + ';' + categoryPath;
            parentCategory = parentCategory.parent;
            parentCategoryID = parentCategory.ID;
        }
        requestBody = {
            recordQueries: [{
                id: this.config.productSearch.ID,
                typeOfRequest: this.config.productSearch.typeCategory,
                settings: {
                    query: {
                        categoryPath: categoryPath || ''
                    },
                    limit: this.config.searchLimit || 2000,
                    offset: offset || 0,
                    fields: [
                        this.config.productSearch.field
                    ],
                    typeOfRecords: [
                        this.config.productSearch.recordType
                    ]
                }
            }],
            context: {
                apiKeys: [
                    this.config.apiKey
                ]
            }
        };
    } else {
        requestBody = {
            recordQueries: [{
                id: this.config.productSearch.ID,
                typeOfRequest: this.config.productSearch.typeSearch,
                settings: {
                    query: {
                        term: !(isCategorySearch && (query === this.config.root)) ? query : '*'
                    },
                    limit: this.config.searchLimit || 2000,
                    offset: offset || 0,
                    fields: [
                        this.config.productSearch.field
                    ],
                    typeOfRecords: [
                        this.config.productSearch.recordType
                    ]
                }
            }],
            context: {
                apiKeys: [
                    this.config.apiKey
                ]
            }
        };
    }
    if (searchType) {
        requestBody.recordQueries[0].settings.typeOfSearch = searchType;
    }
    Logger.info('Request: ' + JSON.stringify(requestBody));
    var response = klevuHttpServiceInit.serviceCall('POST', this.config.searchEndPoint,
        JSON.stringify(requestBody), this.config.serviceName);
    var returnValue;

    try {
        returnValue = JSON.parse(response);
    } catch (e) {
        Logger.error('Unexpected response from search API. Check Storefront Search URL in site preference.');
    }

    return returnValue;
};

/**
 * Calls Klevu API every page of search results for query and merges them
 * @param {string} query - search term
 * @param {boolean} isCategorySearch - true if this is a category search
 * @returns {Object} response - response object
 */
klevuUtils.getAllSearchResults = function (query, isCategorySearch) {
    var result = this.triggerSearchAPI(query, isCategorySearch);
    if (result) {
        var totalResultsFound = result.queryResults[0].meta.totalResultsFound;
        var currentResultsFound = result.queryResults[0].records.length;

        while (currentResultsFound < totalResultsFound) {
            var newResult = this.triggerSearchAPI(query, isCategorySearch, result.queryResults[0].meta.typeOfSearch, currentResultsFound);
            result.queryResults[0].records = result.queryResults[0].records.concat(newResult.queryResults[0].records);
            currentResultsFound += newResult.queryResults[0].records.length;
        }
        for (var i = 0; i < result.queryResults[0].records.length; i++) {
            var product = ProductMgr.getProduct(result.queryResults[0].records[i].itemGroupId);

            if (!(product && product.onlineFlag)) {
                result.queryResults[0].records.splice(i, 1);
                --i;
            }
        }
    }
    return result;
};

/**
 * Calls Klevu content search API and fetches results for Content Search Page
 *
 * @param {string} query - search term
 * @param {number} pageSize - the number of results to fetch
 * @param {number} offset - the offset for fetching paginated results
 * @param {string} searchType - the last search type for paginated searches
 * @returns {Object} response - response object
 */
klevuUtils.triggerContentSearch = function (query, pageSize, offset, searchType) {
    var klevuHttpServiceInit = require('*/cartridge/scripts/service/klevuHttpServiceInit');
    var requestBody;
    requestBody = {
        recordQueries: [{
            id: this.config.contentSearch.ID,
            typeOfRequest: this.config.contentSearch.typeSearch,
            settings: {
                query: {
                    term: query
                },
                limit: pageSize || 12,
                offset: offset || 0,
                fields: [
                    this.config.contentSearch.field
                ],
                typeOfRecords: [
                    this.config.contentSearch.recordType
                ]
            }
        }],
        context: {
            apiKeys: [
                this.config.apiKey
            ]
        }
    };
    if (searchType) {
        requestBody.recordQueries[0].settings.typeOfSearch = searchType;
    }
    Logger.info('Content Request: ' + JSON.stringify(requestBody));
    var response = klevuHttpServiceInit.serviceCall('POST', this.config.searchEndPoint,
        JSON.stringify(requestBody), this.config.serviceName);
    var returnValue = {};

    try {
        returnValue = JSON.parse(response);
    } catch (e) {
        Logger.error('Unexpected response from search API. Check Storefront Search URL in site preference.');
    }

    return returnValue;
};

/**
 * Appends the query parameter 'q' to URL
 * @param {string} url - the original url
 * @returns {string} the new url
 */
klevuUtils.appendQueryParam = function (url) {
    if (url && url !== '#' && request.httpParameterMap.q.value) {
        if (url.indexOf('?q=') === -1 && url.indexOf('&q=') === -1) { // the parameter does not exist
            if (url.indexOf('?') === -1) {
                return url + '?q=' + request.httpParameterMap.q.value;
            }
            return url + '&q=' + request.httpParameterMap.q.value;
        }
    }
    return url;
};

/**
 * Check whether Klevu is in use or not
 * @returns {bool}
 */
klevuUtils.isKlevuInUse = function () {
    return this.config.enableKlevuStorefront &&
        (this.config.klevuSearchResultPageLayout != 'SFCC_DEFAULT_NO_KLEVU' ||
            this.config.klevuCategoryPageLayout != 'SFCC_DEFAULT_NO_KLEVU_CATNAV'
        );
}

/**
 * Check whether Klevu theme in use or not
 * @returns {bool}
 */
klevuUtils.isKlevuJSThemeInUse = function () {
    return this.config.enableKlevuStorefront &&
        this.config.klevuSearchResultPageLayout == 'KLEVU_JS_THEME';
}

/**
 * Check whether Preserve store theme in use for search page
 * @returns {bool}
 */
klevuUtils.isKlevuPreserveInUseForSRLP = function () {
    return (this.config.enableKlevuStorefront &&
        this.config.klevuSearchResultPageLayout == 'KLEVU_PRESERVE_STORE_THEME');
}


/**
 * Check whether Klevu JS theme in use for category
 * @returns {bool}
 */
klevuUtils.isKlevuJSThemeInUseCategory = function () {
    return this.config.enableKlevuStorefront &&
        this.config.klevuCategoryPageLayout == 'KLEVU_JS_THEME_CATNAV';
}

/**
 * Check whether Preserve store theme in use for category
 * @returns {bool}
 */
klevuUtils.isKlevuPreserveInUseCategory = function () {
    return this.config.enableKlevuStorefront &&
        this.config.klevuCategoryPageLayout == 'KLEVU_PRESERVE_STORE_THEME_CATNAV';
}


/**
 * General configurations and site preferences
 */
klevuUtils.config = {
    enableKlevuStorefront: Site.getCurrent().getCustomPreferenceValue('enableKlevuStorefront') || false,
    klevuSearchResultPageLayout: Site.getCurrent().getCustomPreferenceValue('klevuSearchResultPageLayout') || false,
    klevuCategoryPageLayout: Site.getCurrent().getCustomPreferenceValue('klevuCategoryPageLayout') || false,
    klevuEnableRecs: Site.getCurrent().getCustomPreferenceValue('klevuEnableRecs') || false,
    klevuEnableRecsUrl: Site.getCurrent().getCustomPreferenceValue('klevuEnableRecsUrl') || false,
    apiKey: Site.getCurrent().getCustomPreferenceValue('klevuAPIKey'),
    searchEndPoint: Site.getCurrent().getCustomPreferenceValue('klevuStorefrontSearchURL'),
    searchLimit: Site.getCurrent().getCustomPreferenceValue('klevuItemSearchLimit'),
    serviceName: 'klevu.http.storefront',
    root: 'root',
    defaultSortingRule: 'best-matches',
    productSearch: {
        ID: 'productSearch',
        typeSearch: 'SEARCH',
        typeCategory: 'CATNAV',
        recordType: 'KLEVU_PRODUCT',
        field: 'itemGroupId'
    },
    contentSearch: {
        ID: 'contentSearch',
        typeSearch: 'SEARCH',
        recordType: 'KLEVU_CMS',
        field: 'id'
    }
};

module.exports = klevuUtils;
