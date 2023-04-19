'use strict';
/* eslint-disable new-cap */
/* global empty */

/**
 * Base Order Export Module Implementation
 * @module
 */

let searchFactory = {
    orderSearchModel: require('~/cartridge/scripts/models/order/klevuOrderSearch')
};

/**
 *@return {Object} order - order object to be sent to klevu
 */
let ExportModel = function () {
    var searchModel = !empty(searchFactory.orderSearchModel) ? new searchFactory.orderSearchModel() : null;

    return {
        getNextItem: function (counter) {
            return searchModel ? searchModel.getNext(counter) : undefined;
        }
    };
};

module.exports = ExportModel;

