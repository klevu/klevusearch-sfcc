'use strict';

/* global empty */
/* eslint consistent-return:0 */

/* API Includes */
const Site = require('dw/system/Site');
const StringUtils = require('dw/util/StringUtils');
const Calendar = require('dw/util/Calendar');

/* Script Includes*/
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuCategoryDeltaExport');
const categoryUtils = require('~/cartridge/scripts/utils/categoryUtils');


/* Global Variables*/
var xsw;
var csvWriter;
var exportModel;
var counter;
var isFullExport = false;
var config = klevuUtils.config;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @returns {void}
 */
function beforeStep() {
    csvWriter = new CsvWriter(config.sentCategoriesHeader);
    csvWriter.initializeCSVStreamWriter(
        StringUtils.format(config.baseKlevuPath + config.sentCategoriesPath, Site.getCurrent().ID),
        StringUtils.format(config.sentCategoriesFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
    );
    var ExportModel = require('~/cartridge/scripts/models/category/klevuCategoryExportModel');
    exportModel = new ExportModel(isFullExport);
}

/**
 * read. Read all the contents
 * @returns {Object} Array of product objects
 */
function read() {
    try {
        var output = exportModel.getNextItem(counter);
        counter = (output && output.count) > 0 ? output.count : 0;
        return output;
    } catch (exception) {
        Logger.error('ERROR :reading category data ');
    }
}

/**
 * process. Retrieve all the needed data for the XML file
 * @param {Object} record - object
 * @returns {Object} Array of category fields
 */
function process(record) { // eslint-disable-line consistent-return
    try {
        if (!empty(record) && !empty(record.category)) {
            return categoryUtils.getcategoryFields(record.category);
        }
    } catch (exception) {
        Logger.error('ERROR :processing category data ');
    }
}

/**
 * write. Write the data in the file
 * @param {dw.util.Collection} lines - Actual payload for third party system
 * @returns {void}
 */
function write(lines) {
    try {
        if (!empty(lines) && lines.length) {
            Logger.info('Found {0} categories for updates', lines.length);
            xsw = categoryUtils.createXml(isFullExport, config.categoryObject);
            categoryUtils.writeData(lines, xsw, csvWriter);
            categoryUtils.closeXml(xsw);
        } else {
            Logger.info('No categories found for updates');
        }
    } catch (exception) {
        Logger.error('ERROR :writing category data ');
    }
}

/**
 * afterStep.
 * @param {boolean} success - XML creation successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (success) {
        Logger.info('Categories of Site catalog file export job executed successfully');
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
