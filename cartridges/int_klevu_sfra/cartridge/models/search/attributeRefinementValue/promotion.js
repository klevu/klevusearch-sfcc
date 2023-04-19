'use strict';

/* global request */

var base = module.superModule;

/**
 * @constructor
 * @classdesc Promotion refinement value model
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - ProductSearchModel instance
 * @param {dw.catalog.ProductSearchRefinementDefinition} refinementDefinition - Refinement
 *     definition
 * @param {dw.catalog.ProductSearchRefinementValue} refinementValue - Raw DW refinement value
 * @param {boolean} selected - Selected flag
 */
function PromotionRefinementValueWrapper(productSearch, refinementDefinition, refinementValue, selected) {
    base.call(this, productSearch, refinementDefinition, refinementValue, selected);

    var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
    if ((klevuUtils.isKlevuPreserveInUseForSRLP() && request.httpParameterMap.q.value)
        || (klevuUtils.isKlevuPreserveInUseCategory() && !request.httpParameterMap.q.value)
    ) {
        this.url = klevuUtils.appendQueryParam(this.url);
    }
}

module.exports = PromotionRefinementValueWrapper;
