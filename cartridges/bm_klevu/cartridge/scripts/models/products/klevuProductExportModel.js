/* eslint-disable new-cap */
/* global empty */

/**
 * Base Export Module Implementation
 * @module
 */
'use strict';

let searchFactory = {
    productSearchModel: require('~/cartridge/scripts/models/products/klevuProductSearch')
};

/**
 * @class
 * @param {Object} parameters - initialization params
 */
let ExportModel = function (parameters) {
    var searchModel = !empty(searchFactory.productSearchModel) ? new searchFactory.productSearchModel(parameters) : null;

    return {
        getNextItem: function () {
            return searchModel ? searchModel.getNext() : undefined;
        }
    };
};

module.exports = ExportModel;
