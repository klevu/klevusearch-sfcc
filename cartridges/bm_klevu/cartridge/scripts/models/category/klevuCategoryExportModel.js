/* eslint-disable new-cap */
/* global empty */

/**
 * Base Export Module Implementation
 * @module
 */
'use strict';

let searchFactory = {
    categorySearchModel: require('~/cartridge/scripts/models/category/klevuCategorySearch')
};

/**
 *@class
 *@param {boolean} isFullExport - full export or delta export
 *@return {Object} category - category object to be written in the xml file
 */
let ExportModel = function (isFullExport) {
    var searchModel = !empty(searchFactory.categorySearchModel) ? new searchFactory.categorySearchModel(isFullExport) : null;

    return {
        getNextItem: function (counter) {
            return searchModel ? searchModel.getNext(counter) : undefined;
        }
    };
};

module.exports = ExportModel;
