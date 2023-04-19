/* global empty */
/* eslint consistent-return:0 */

'use strict';

/* API Includes */
const StringUtils = require('dw/util/StringUtils');
const Site = require('dw/system/Site');
const File = require('dw/io/File');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuMasterAttributesExport');
const productUtils = require('~/cartridge/scripts/utils/productUtils');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');

/* Global Variables*/
var exportModel;
var refinementAttrArray = [];
var isFullExport = true;
var config = klevuUtils.config;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @param {Object} parameters - initialization params
 * @returns {void}
 */
function beforeStep(parameters) {
    if (isFullExport) {
        var directoryPath = StringUtils.format(config.baseKlevuPath + config.sentProductsPath, Site.getCurrent().ID);
        var directory = new File(directoryPath);
        klevuUtils.deleteDirectory(directory);
    }
    var ExportModel = require('~/cartridge/scripts/models/products/klevuProductExportModel.js');
    exportModel = new ExportModel(parameters);
}

/**
 * read. Read all the master products
 * @returns {Array} Array of product objects
 */
function read() {
    try {
        var response = exportModel.getNextItem();
        if (refinementAttrArray.length === 0) {
            refinementAttrArray = response.refinementAttributesArray;
        }
        return response.product;
    } catch (exception) {
        Logger.error('ERROR : while reading master product data : ' + exception.stack + ' with Error: ' + exception.message);
    }
}

/**
 * process. Retrieve all the needed data for the XML file
 * @param {dw.catalog.Product|dw.catalog.Variant} record - object
 * @returns {Array} Array of required fields
 */
function process(record) {
    return record;
}

/**
 * write. Write the data in the file
 * @param {Collection} lines - Actual payload for 3rd party system
 * @returns {void}
 */
function write(lines) {
    if (!empty(lines) && lines.length) {
        productUtils.writeMasterData(lines, refinementAttrArray, isFullExport);
    }
}

/**
 * afterStep.
 * @param {boolean} success - XML creation successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (success) {
        Logger.info('Product Mandatory Attributes file created successfully');
    }
}

module.exports = {
    beforeStep: beforeStep,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
