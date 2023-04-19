/* eslint-disable new-cap */
/* global empty */

/**
 * Base Export Module Implementation
 * @module
 */
'use strict';

let searchFactory = {
    contentAssetsSearchModel: require('~/cartridge/scripts/models/contentAssets/klevuContentAssetSearch')
};

/**
 * @class
 *@return {Object} content - content object to be written in the xml file
 */
let ExportModel = function () {
    var searchModel = !empty(searchFactory.contentAssetsSearchModel) ? new searchFactory.contentAssetsSearchModel() : null;

    return {
        getNextItem: function () {
            return searchModel ? searchModel.getNext() : undefined;
        }
    };
};

module.exports = ExportModel;
