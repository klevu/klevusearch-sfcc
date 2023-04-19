/* global empty */
/* eslint consistent-return:0 */

'use strict';

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuMasterAttributesDeltaExport');
const productUtils = require('~/cartridge/scripts/utils/productUtils');

/* Global Variables*/
var exportModel;
var refinementAttrArray = [];
var isFullExport = false;
var isRecordsWrittenToXml = false;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @param {Object} parameters - initialization params
 * @returns {void}
 */
function beforeStep(parameters) {
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
        isRecordsWrittenToXml = productUtils.writeMasterData(lines, refinementAttrArray, isFullExport, false);
    }
}

/**
 * afterStep.
 * @param {boolean} success - XML creation successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (isRecordsWrittenToXml === false) {
        Logger.info('No records of Master Products found to write in xml');
    }
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
