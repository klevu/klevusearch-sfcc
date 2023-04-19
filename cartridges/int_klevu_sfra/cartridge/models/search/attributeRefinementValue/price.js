'use strict';

/* global request */

var base = module.superModule;

/**
 * @constructor
 * @classdesc Price refinement value class
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - ProductSearchModel instance
 * @param {dw.catalog.ProductSearchRefinementDefinition} refinementDefinition - Refinement
 *     definition
 * @param {dw.catalog.ProductSearchRefinementValue} refinementValue - Raw DW refinement value
 */
function PriceRefinementValueWrapper(productSearch, refinementDefinition, refinementValue) {
    base.call(this, productSearch, refinementDefinition, refinementValue);

    var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
    if ( (klevuUtils.isKlevuPreserveInUseForSRLP() && request.httpParameterMap.q.value) 
	|| (!request.httpParameterMap.q.value && klevuUtils.isKlevuPreserveInUseCategory()) ) {
        this.url = klevuUtils.appendQueryParam(this.url);
    }
}

module.exports = PriceRefinementValueWrapper;
