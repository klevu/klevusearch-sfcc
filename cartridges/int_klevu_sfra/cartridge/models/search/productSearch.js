'use strict';

/* global request */
/* eslint  no-param-reassign:0 */

var base = module.superModule;
var ArrayList = require('dw/util/ArrayList');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var collections = require('*/cartridge/scripts/util/collections');
var preferences = require('*/cartridge/config/preferences');
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
var klevuRefinements;

var DEFAULT_PAGE_SIZE = preferences.defaultPageSize ? preferences.defaultPageSize : 12;

/**
 * Configures and returns a PagingModel instance
 *
 * @param {dw.util.Iterator} productHits - Iterator for product search results
 * @param {number} count - Number of products in search results
 * @param {number} pageSize - Number of products to display
 * @param {number} startIndex - Beginning index value
 * @return {dw.web.PagingModel} - PagingModel instance
 */
function getPagingModel(productHits, count, pageSize, startIndex) {
    var PagingModel = require('dw/web/PagingModel');
    var paging = new PagingModel(productHits, count);

    paging.setStart(startIndex || 0);
    paging.setPageSize(pageSize || DEFAULT_PAGE_SIZE);

    return paging;
}

/**
 * Generates URL for [Show] More button
 *
 * @param {dw.util.Iterator} productHits - Iterator for product search results
 * @param {number} count - Number of products in search results
 * @param {Object} httpParams - HTTP query parameters
 * @return {string} - More button URL
 */
function getShowMoreUrl(productHits, count, httpParams) {
    var showMoreEndpoint = 'Search-KlevuUpdateGrid';
    var currentStart = httpParams.start || 0;
    var pageSize = httpParams.sz || DEFAULT_PAGE_SIZE;
    var hitsCount = count;
    var nextStart;

    var paging = getPagingModel(
        productHits,
        hitsCount,
        DEFAULT_PAGE_SIZE,
        currentStart
    );

    if (pageSize >= hitsCount) {
        return '';
    } else if (pageSize > DEFAULT_PAGE_SIZE) {
        nextStart = pageSize;
    } else {
        var endIdx = paging.getEnd();
        nextStart = endIdx + 1 < hitsCount ? endIdx + 1 : null;

        if (!nextStart) {
            return '';
        }
    }

    paging.setStart(nextStart);

    var URLUtils = require('dw/web/URLUtils');
    var baseUrl = URLUtils.url(showMoreEndpoint);
    var whitelistedParams = ['q', 'cgid', 'pmin', 'pmax', 'srule', 'pmid'];

    Object.keys(httpParams).forEach(function (element) {
        if (whitelistedParams.indexOf(element) > -1) {
            baseUrl.append(element, httpParams[element]);
        }

        if (element === 'preferences') {
            var i = 1;
            Object.keys(httpParams[element]).forEach(function (preference) {
                baseUrl.append('prefn' + i, preference);
                baseUrl.append('prefv' + i, httpParams[element][preference]);
                i++;
            });
        }
    });
    var finalUrl = paging.appendPaging(baseUrl);
    return finalUrl.toString();
}

/**
 * Sorts the given arraylist using the rule given in httpParams
 *
 * @param {ArrayList} resultsList - ArrayList of products to be shown on PLP
 * @param {Object} httpParams - the query parameters
 * @returns {ArrayList} - the sorted ArrayList
 */
function sortResults(resultsList, httpParams) {
    var sortingRuleID;

    if (httpParams.srule) {
        sortingRuleID = httpParams.srule;
    } else if (httpParams.q) {
        sortingRuleID = CatalogMgr.getSiteCatalog().getRoot().defaultSortingRule.ID;
    } else if (httpParams.cgid) {
        sortingRuleID = CatalogMgr.getCategory(httpParams.cgid).defaultSortingRule.ID;
    }
    var sortingRule;
    if (sortingRuleID !== klevuUtils.config.defaultSortingRule) {
        sortingRule = CatalogMgr.getSortingRule(sortingRuleID);
    }

    if (resultsList.size() && sortingRule) {
        resultsList.sort(function (item1, item2) {
            var productSearch = new ProductSearchModel();
            productSearch.setProductIDs(new ArrayList(item1.itemGroupId, item2.itemGroupId));
            productSearch.setSortingRule(sortingRule);
            productSearch.search();
            var productSearchHits = productSearch.getProductSearchHits();

            while (productSearchHits.hasNext()) {
                var productSearchHit = productSearchHits.next();
                var productID = productSearchHit.productID;
                if (productID === item1.itemGroupId) {
                    return -1;
                } else if (productID === item2.itemGroupId) {
                    return 1;
                }
            }
            return 0;
        });
    }
    return resultsList;
}

/**
 * Returns the refinement values that have been selected
 *
 * @param {Array.<CategoryRefinementValue|AttributeRefinementValue|PriceRefinementValue>}
 *     refinements - List of all relevant refinements for this search
 * @return {Object[]} - List of selected filters
 */
function getSelectedFilters(refinements) {
    var selectedFilters = [];
    var selectedValues = [];

    refinements.forEach(function (refinement) {
        selectedValues = refinement.values.filter(function (value) {
            return value.selected;
        });
        if (selectedValues.length) {
            selectedFilters.push.apply(selectedFilters, selectedValues);
        }
    });

    return selectedFilters;
}

/**
 * Generates URL that removes refinements, essentially resetting search criteria
 * @param {Object} httpParams - Query params
 * @return {string} - URL to reset query to original search
 */
function getResetLink(httpParams) {
    var ACTION_ENDPOINT_AJAX = 'Search-KlevuShowAjax';
    var URLUtils = require('dw/web/URLUtils');
    return httpParams.q
        ? URLUtils.url(ACTION_ENDPOINT_AJAX, 'q', httpParams.q).toString()
        : URLUtils.url(ACTION_ENDPOINT_AJAX, 'cgid', httpParams.cgid).toString();
}

/**
 * @constructor
 * @classdesc ProductSearch class
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @param {string} sortingRule - Sorting option rule ID
 * @param {dw.util.ArrayList.<dw.catalog.SortingOption>} sortingOptions - Options to sort search
 *     results
 * @param {dw.catalog.Category} rootCategory - Search result's root category if applicable
 * @param {dw.catalog.SearchRefinements} refinements - Search result's root category if applicable
 * @param {Object} klevuProducts - klevu Products
 * @param {number} klevuProductsCount - Number of klevu products
 */
function ProductSearch(productSearch, httpParams, sortingRule, sortingOptions, rootCategory, refinements, klevuProducts, klevuProductsCount) {
    base.call(this, productSearch, httpParams, sortingRule, sortingOptions, rootCategory);

    if (refinements) {
        klevuRefinements = refinements;
    }

    if ((klevuUtils.isKlevuPreserveInUseForSRLP() && httpParams.q)
        || (!httpParams.q && klevuUtils.isKlevuPreserveInUseCategory())
        && request.httpPath.indexOf('Search-Refinebar') === -1) {

        var resultValue;
        var resultsIterator;

        if ((httpParams.q || httpParams.cgid) && klevuProducts && klevuProductsCount) {
            resultValue = klevuProducts.split(',').map(function (item) {
                return {
                    itemGroupId: item
                };
            });
        } else {
            var selectedCategory = CatalogMgr.getCategory(httpParams.cgid);
            selectedCategory = selectedCategory && selectedCategory.online ? selectedCategory : null;

            if (httpParams.q) {
                this.isCategorySearch = false;
                this.klevuSearchTerm = httpParams.q;
            } else if (selectedCategory) {
                this.isCategorySearch = true;
                this.klevuSearchTerm = httpParams.cgid;
                this.category = {
                    name: selectedCategory.displayName,
                    id: selectedCategory.ID,
                    pageTitle: selectedCategory.pageTitle,
                    pageDescription: selectedCategory.pageDescription,
                    pageKeywords: selectedCategory.pageKeywords
                };
            }
            var result = klevuUtils.getAllSearchResults(this.klevuSearchTerm, this.isCategorySearch);
            if (result) {
                resultValue = result.queryResults[0].records;
                klevuProducts = resultValue.map(function (item) {
                    return item.itemGroupId;
                }).join(',');
                klevuProductsCount = resultValue.length;
                resultsIterator = new ArrayList(resultValue).iterator();
                this.klevuProducts = klevuProducts;
            } else {
                resultValue = [];
                klevuProducts = '';
                klevuProductsCount = 0;
                resultsIterator = new ArrayList(resultValue).iterator();
                this.klevuProducts = klevuProducts;
            }
        }

        var resultsList = new ArrayList(resultValue);
        resultsList = sortResults(resultsList, httpParams);
        resultsIterator = resultsList.iterator();
        this.pageSize = DEFAULT_PAGE_SIZE;
        var startIdx = httpParams.start || 0;
        var paging = getPagingModel(
            resultsIterator,
            klevuProductsCount,
            this.pageSize,
            startIdx
        );
        this.pageNumber = paging.currentPage;
        this.productIds = collections.map(paging.pageElements, function (item) {
            return {
                productID: item.itemGroupId,
                productSearchHit: item
            };
        });
        this.showMoreUrl = getShowMoreUrl(
            resultsIterator,
            klevuProductsCount,
            httpParams
        );
        this.count = klevuProductsCount;
        this.searchKeywords = httpParams.q || '';
        this.resetLink = getResetLink(httpParams);
    }
}

ProductSearch.prototype = Object.create(base.prototype);

if (klevuUtils.config.enableKlevuStorefront
    && (klevuUtils.isKlevuPreserveInUseForSRLP() && request.httpParameterMap.q.value)
    || (klevuUtils.isKlevuPreserveInUseCategory() && !request.httpParameterMap.q.value)) {

    Object.defineProperty(ProductSearch.prototype, 'refinements', {
        get: function () {
            return klevuRefinements;
        }
    });

    Object.defineProperty(ProductSearch.prototype, 'selectedFilters', {
        get: function () {
            return getSelectedFilters(this.refinements);
        }
    });
}

module.exports = ProductSearch;
