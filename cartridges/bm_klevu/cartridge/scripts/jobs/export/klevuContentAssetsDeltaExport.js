/* global empty */
/* eslint consistent-return:0 */

'use strict';

/* API Includes */
const Site = require('dw/system/Site');
const StringUtils = require('dw/util/StringUtils');
const Calendar = require('dw/util/Calendar');

/* Script Includes*/
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuContentAssetsDeltaExport');
const contentUtils = require('~/cartridge/scripts/utils/contentAssetsUtils');

/* Global Variables*/
var xsw;
var csvWriter;
var exportModel;
var isFullExport = false;
var config = klevuUtils.config;

/**
 * beforeStep. Creation of the file and initialization XML file
 * @returns {void}
 */
function beforeStep() {
    csvWriter = new CsvWriter(config.sentContentHeader);
    csvWriter.initializeCSVStreamWriter(
        StringUtils.format(config.baseKlevuPath + config.sentContentPath, Site.getCurrent().ID),
        StringUtils.format(config.sentContentFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
    );
    var ExportModel = require('~/cartridge/scripts/models/contentAssets/klevuContentAssetExportModel.js');
    exportModel = new ExportModel();
}

/**
 * read. Read all the content assets
 * @returns {Array} Array of content objects
 */
function read() {
    try {
        return exportModel.getNextItem();
    } catch (exception) {
        Logger.error('ERROR :retrieving CMS data ');
    }
}

/**
 * process. Retrieve all the needed data for the XML file
 * @param {dw.content.Content} record - object
 * @returns {Array} Array of required fields
 */
function process(record) {
    try {
        return contentUtils.deltaExport(record);
    } catch (exception) {
        Logger.error('ERROR :processing CMS data ');
    }
}

/**
 * write. Write the data in the file
 * @param {Collection} lines - Actual payload for 3rd party system
 * @returns {void}
 */
function write(lines) {
    try {
        if (!empty(lines) && lines.length) {
            Logger.info('content assets count sent to write in xml : ' + lines.length);
            xsw = contentUtils.createXml(isFullExport, config.contentObject);
            contentUtils.writeData(lines, xsw, csvWriter);
            contentUtils.closeXml(xsw);
        }
    } catch (exception) {
        Logger.error('ERROR :writing CMS data ');
    }
}

/**
 * afterStep.
 * @param {boolean} success - XML creation successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (success) {
        Logger.info('Content assets file created successfully');
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
