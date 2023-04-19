/* global empty */
/* eslint  consistent-return:0 */

'use strict';

/* API Includes */
const StringUtils = require('dw/util/StringUtils');
const Site = require('dw/system/Site');
const Calendar = require('dw/util/Calendar');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuSimpleAttributesExport');
const productUtils = require('~/cartridge/scripts/utils/productUtils');
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');

/* Global Variables*/
var xsw;
var csvWriter;
var exportModel;
var refinementAttrArray = [];
var isFullExport = true;
var config = klevuUtils.config;
var writeDataResponse;
var fileClosed = false;
var simpleProductsCount;
var chunkCount = 0;
var jobParams;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @param {Object} parameters - initialization params
 * @returns {void}
 */
function beforeStep(parameters) {
    jobParams = parameters;
    csvWriter = new CsvWriter(config.sentProductsHeader);
    csvWriter.initializeCSVStreamWriter(
        StringUtils.format(config.baseKlevuPath + config.sentProductsPath, Site.getCurrent().ID),
        StringUtils.format(config.sentProductsFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
    );
    var ExportModel = require('~/cartridge/scripts/models/products/klevuProductExportModel.js');
    exportModel = new ExportModel(parameters);
}

/**
 * read. Read all the simple products
 * @returns {Array} Array of product objects
 */
function read() {
    try {
        var response = exportModel.getNextItem();
        if (refinementAttrArray.length === 0) {
            refinementAttrArray = response.refinementAttributesArray;
        }
        if (response.product && !empty(response.product)) {
            Logger.info(' - type : {0} : {1}', response.product.bundle ? 'bundle - ' : 'set - ', response.product.ID);
        }
        return response.product;
    } catch (exception) {
        Logger.error('ERROR : while reading product data : ' + exception.stack + ' with Error: ' + exception.message);
    }
}

/**
 * process. Retrieve all the needed data for the XML file
 * @param {dw.catalog.Product|dw.catalog.Variant} record - object
 * @returns {Array | undefined} Array of required fields
 */
function process(record) {
    if (record && (record.bundle || record.productSet)) {
        var processedProduct = productUtils.getMandatoryFields(record, isFullExport);
        if (processedProduct && processedProduct.product.productSet && processedProduct.price.includes("0.00")) {
            var priceModel = processedProduct.product.getPriceModel();
            processedProduct.price = priceModel ? priceModel.minPrice.decimalValue + " " + priceModel.minPrice.currencyCode : processedProduct.price;
        }
        return processedProduct;
    }
}

/**
 * write. Write the data in the file
 * @param {Collection} lines - Actual payload for 3rd party system
 * @returns {void}
 */
function write(lines) {
    if (!empty(lines) && lines.length) {
        Logger.info("### Processing chunk {0} of products - total : {1} products found ###", chunkCount, lines.length);
        isFullExport = jobParams.exportMode === 'delta' ? false : true;
        writeDataResponse = productUtils.writeData(lines, xsw, csvWriter, refinementAttrArray, isFullExport);
        xsw = writeDataResponse.xsw;
        fileClosed = writeDataResponse.fileClosed;
        simpleProductsCount = writeDataResponse.simpleProductsCount;
        chunkCount++;
    }
}

/**
 * afterStep.
 * @param {boolean} success - XML creation successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (fileClosed === false) {
        productUtils.closeXml(xsw, isFullExport);
    }

    if (success) {
        Logger.info('Product bundle and sets count sent to write in xml : ' + simpleProductsCount);
        Logger.info('Product Mandatory Attributes file created successfully');
    }
    csvWriter.closeStream();
}
 

module.exports = {
    beforeStep: beforeStep,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};