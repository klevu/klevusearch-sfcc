/* global empty */
/* eslint  no-param-reassign:0 */
/* eslint  no-continue:0 */
/* eslint  consistent-return:0 */
/* eslint  no-self-assign:0 */

'use strict';

/* API Includes */
const CatalogMgr = require('dw/catalog/CatalogMgr');
const File = require('dw/io/File');
const Site = require('dw/system/Site');

/* Script Includes */
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuCategorySearch');
const categoryUtils = require('~/cartridge/scripts/utils/categoryUtils');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');

/* Global Variables*/
var config = klevuUtils.config;

/**
 * Module for the Custom Job Step for the Product Feed Export
 */


/**
 * Object implements default searchModel interface
 * @param {boolean} isFullExport - full export or delta export
 * @return {Object} public api methods
 */
let searchModel = function (isFullExport) {
    Logger.info('Starting category export....');

    var siteRootCategory = CatalogMgr.getSiteCatalog().getRoot();
    var allsubCategories = categoryUtils.getAllSubCategories(siteRootCategory);

    Logger.info('Total {0} categories found from the database', allsubCategories.length);

    return {
        getNext: function (counter) {
            var category = null;
            var index;
            var response;
            for (index = 0; index < allsubCategories.length; index++) {
                counter = counter >= 0 ? counter : -1;
                index = index;

                if (counter > index) {
                    continue;
                }

                category = allsubCategories[index];

                if (!isFullExport) {
                    let customCache = require('~/cartridge/scripts/utils/customCacheWebdav');
                    let SEP = File.SEPARATOR;
                    let objectTypeName = config.categoryObject;
                    let endPoint = Site.getCurrent().getID() ? Site.getCurrent().getID() + SEP + objectTypeName : objectTypeName;

                    if (category.lastModified.getTime() && customCache.getCacheTime(endPoint)) {
                        category = category.lastModified.getTime() > customCache.getCacheTime(endPoint) ? category : null;
                    } else {
                        category = null;
                        if (index === 0) {
                            Logger.info('Please run category full export once, before running delta job');
                        }
                    }
                }

                if (index === 0) {
                    counter = 1;
                } else {
                    counter++;
                }

                response = {
                    category: category,
                    count: counter
                };

                if (category) {
                    Logger.info('Processing category ID : ' + category.ID);
                }

                return !empty(response) ? response : null;
            }
        }
    };
};

module.exports = searchModel;
