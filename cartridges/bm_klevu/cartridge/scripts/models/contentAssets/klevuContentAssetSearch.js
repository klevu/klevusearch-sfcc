/* global empty */
/* eslint  no-param-reassign:0 */

'use strict';
/* API Includes */
const ContentSearchModel = require('dw/content/ContentSearchModel');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuContentAssetSearch');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');

/* Global Variables*/
var config = klevuUtils.config;


/**
 * Module for the Custom Job Step for the Content Assets Feed Export
 */

/**
 * Object implements default searchModel interface
 * @return {Object} public api methods
 */
let searchModel = function () {
    Logger.info('Starting content Search....');
    let apiContentSearchModel = new ContentSearchModel();

    try {
        apiContentSearchModel.setRecursiveFolderSearch(true);
        apiContentSearchModel.setFilteredByFolder(true);
        apiContentSearchModel.setFolderID(config.root);
        apiContentSearchModel.search();
    } catch (e) {
        Logger.error('Klevu searchModel() -> failed: ' + e.toString() + ' in ' + e.fileName + ':' + e.lineNumber);
        return false;
    }

    var rootFolderContents = apiContentSearchModel.getFolder().getContent();
    var subFloders = apiContentSearchModel.getFolder().getSubFolders().iterator();
    var folder;
    var representedContents = [];

    if (!empty(rootFolderContents)) {
        representedContents = rootFolderContents.toArray();
    }

    return {
        getNext: function () {
            var result = null;

            if (empty(representedContents) && subFloders.hasNext()) {
                folder = subFloders.next();

                var contents = folder.getContent();

                if (!empty(contents)) {
                    representedContents = representedContents.concat(contents.toArray());
                }

                representedContents = searchModel.getSubFloders(folder, representedContents);
            }

            if (!empty(representedContents)) {
                result = representedContents.pop();
            }
            return result;
        }
    };
};

/**
 * Gets sub folders and content assets of given folder
 * @param {Object} folder - params for searchModel
 * @param {Object} representedContents - Object of content assets
 * @return {Object} Object of content assets
 */
searchModel.getSubFloders = function (folder, representedContents) {
    var subFolder = folder.getSubFolders();

    if (!empty(subFolder)) {
        var subFolderItr = subFolder.iterator();
        var count = 0; // eslint-disable-line no-unused-vars

        while (subFolderItr.hasNext()) {
            var eachFolder = subFolderItr.next();
            var contents = eachFolder.getContent();

            if (!empty(contents)) {
                representedContents = representedContents.concat(contents.toArray());
            }

            representedContents = this.getSubFloders(eachFolder, representedContents);
            count++;
        }
    }

    return representedContents;
};

module.exports = searchModel;
