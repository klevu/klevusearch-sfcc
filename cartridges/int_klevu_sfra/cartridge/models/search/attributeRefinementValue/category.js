'use strict';

/* global request */

var base = module.superModule;
var ACTION_ENDPOINT = 'Search-KlevuShowAjax';

/**
 * Gets category refinement URL
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - product search model
 * @param {string} actionEndpoint - action end point
 * @param {string} id - category id
 * @param {string} value - value
 * @param {boolean} selected - whether category is selected
 * @returns {string} category url
 */
function getUrl(productSearch, actionEndpoint, id, value, selected) {
    var url = '';

    if (selected) {
        if (productSearch.category && productSearch.category.parent) {
            url = productSearch
                .urlRefineCategory(actionEndpoint, productSearch.category.parent.ID)
                .relative()
                .toString();
        } else {
            url = productSearch.urlRefineCategory(actionEndpoint, id).relative().toString();
        }
    } else {
        url = productSearch.urlRefineCategory(actionEndpoint, id).relative().toString();
    }
    if (url.indexOf('?') === -1) {
        url += '?isCategoryRefinement=true';
    } else {
        url += '&isCategoryRefinement=true';
    }
    return url;
}

/**
 * @constructor
 * @classdesc Category attribute refinement value model
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - ProductSearchModel instance
 * @param {dw.catalog.ProductSearchRefinementDefinition} refinementDefinition - Refinement
 *     definition
 * @param {dw.catalog.Category} category - a Category instance
 * @param {boolean} selected - Selected flag
 */
function CategoryRefinementValueWrapper(productSearch, refinementDefinition, category, selected) {
    base.call(this, productSearch, refinementDefinition, category, selected);

    var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
    if ((klevuUtils.isKlevuPreserveInUseForSRLP() && request.httpParameterMap.q.value)
        || (!request.httpParameterMap.q.value && klevuUtils.isKlevuPreserveInUseCategory())) {
        this.actionEndpoint = ACTION_ENDPOINT;
        this.url = klevuUtils.appendQueryParam(getUrl(
            productSearch,
            this.actionEndpoint,
            this.id,
            this.value,
            this.selected
        ));
    }
}

module.exports = CategoryRefinementValueWrapper;
