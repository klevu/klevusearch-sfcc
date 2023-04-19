'use strict';

/* API Includes */
var File = require('dw/io/File');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var Site = require('dw/system/Site');

/* Script Includes*/
var customCacheWebdav = require('~/cartridge/scripts/utils/customCacheWebdav');

/**
 * @desc sets last exported time to custom cache for each exported job
 * @param {string} objectTypeName - type of object name to be created in custom cache.
 */
function setLastExportedTime(objectTypeName) {
    const SEP = File.SEPARATOR;
    var format = 'yyyy-MM-dd\'T\'HH:mm:ss\'Z\'';
    var exportedTime = StringUtils.formatCalendar(new Calendar(), format);
    var endPoint = Site.getCurrent().getID() ? Site.getCurrent().getID() + SEP + objectTypeName : objectTypeName;
    customCacheWebdav.setCache(endPoint, exportedTime);
}

/**
 * @desc Runs the relevant functions
 * @param {Object} args - job parameter
 */
function run(args) {
    setLastExportedTime(args.ObjectTypeName);
}

module.exports = {
    Run: run
};
