'use strict';

/* global empty */
/* eslint consistent-return:0 */

/* API Includes */
const Site = require('dw/system/Site');
const File = require('dw/io/File');
const StringUtils = require('dw/util/StringUtils');
const Calendar = require('dw/util/Calendar');

/* Script Includes*/
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuCategoryExport');
const categoryUtils = require('~/cartridge/scripts/utils/categoryUtils');


/* Global Variables*/
var xsw;
var csvWriter;
var exportModel;
var counter;
var isFullExport = true;
var config = klevuUtils.config;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @returns {void}
 */
function beforeStep() {
    if (isFullExport) {
        var directoryPath = StringUtils.format(config.baseKlevuPath + config.sentCategoriesPath, Site.getCurrent().ID);
        var directory = new File(directoryPath);
        klevuUtils.deleteDirectory(directory);
    }
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
 * @returns {Array} Array of product objects
 */
function read() {
    try {
        var output = exportModel.getNextItem(counter);
        counter = (output && output.count) > 0 ? output.count : 0;
        var categoryObject = !empty(output) && !empty(output.category) ? output.category : null;
        return categoryObject;
    } catch (exception) {
        Logger.error('ERROR :reading category data ');
    }
}

/**
 * process. Retrieve all the needed data for the XML file
 * @param {dw.catalog.Category} record - object
 * @returns {Array} Array of category fields
 */
function process(record) {
    try {
        return categoryUtils.getcategoryFields(record);
    } catch (exception) {
        Logger.error('ERROR :processing category data ');
    }
}

/**
 * write. Write the data in the file
 * @param {Collection} lines - Actual payload for third party system
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
