'use strict';

/* eslint no-cond-assign: 0 */
/* eslint no-unneeded-ternary: 0 */

/**
 * This feature uses WebDav folder as custom cache.
 */

/* API Includes*/
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const FileReader = require('dw/io/FileReader');
const Calendar = require('dw/util/Calendar');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('customCacheWebdav');

var CACHE_BASE_FOLDER = File.IMPEX; // File.IMPEX or File.TEMP
var SEP = File.SEPARATOR;
var CACHE_FOLDER_NAME = 'customcache';
var CACHE_PROJECT_CODE = 'klevu'; // folder name for project
var CACHE_FILE_EXT = '.txt';

/**
 * @desc Return relative folder path of the cache - removes base domain part and final filename part
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns relative folder path of the cache - removes base domain part and final filename part
 */
function getRelativeFolderPath(endPoint) {
    var relFolderPath = endPoint.replace(/\s/g, '');
    relFolderPath = relFolderPath.substring(0, relFolderPath.lastIndexOf('/'));
    relFolderPath = relFolderPath.replace(/\//g, SEP);

    return relFolderPath;
}


/**
 * @desc Generates cache file name from end point
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns file name for the given endpoint
 */
function getCacheFileName(endPoint) {
    var fileName = endPoint.replace(/\s/g, '');

    if (fileName.lastIndexOf('/') + 1 === fileName.length) {
        // remove trailing '/'
        fileName = fileName.substring(0, fileName.length - 1);
    }

    fileName = fileName.substring(fileName.lastIndexOf('/') + 1, fileName.length);
    fileName += CACHE_FILE_EXT;

    return fileName;
}

/**
 * @desc Generates full cache file name
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @returns {string} - returns full file path for the given endpoint
 */
function getFullFileName(endPoint) {
    var relFolderPath = getRelativeFolderPath(endPoint);
    var fileName = getCacheFileName(endPoint);
    var fullFolderPath = CACHE_BASE_FOLDER + SEP + CACHE_FOLDER_NAME + SEP + CACHE_PROJECT_CODE + SEP + relFolderPath;
    var cacheFolder = new File(fullFolderPath);

    if (!cacheFolder.exists()) {
        try {
            cacheFolder.mkdirs();
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while making folders for end point: ' + endPoint);
        }
    }

    var fullFileName = fullFolderPath + SEP + fileName;

    return fullFileName;
}

/**
 * @desc Keeps API response in cache
 * @param {string} endPoint - unique identifier for the file to be created as cache. Should begin with '/'
 * @param {Object} data - the object to be stored in the cache
 */
function setCache(endPoint, data) {
    if (endPoint.indexOf('?') > -1) {
        return;
    }

    var dataToCache = typeof data === 'string' ? data : JSON.stringify(data);

    var fullFileName = getFullFileName(endPoint);
    var cacheFile = new File(fullFileName);
    var fileWriter = new FileWriter(cacheFile);

    try {
        fileWriter.write(dataToCache);
    } catch (e) {
        Logger.error(e.getMessage());
        Logger.error('Error while writing content to cache for end point: ' + endPoint);
    } finally {
        if (fileWriter !== null) {
            fileWriter.flush();
            fileWriter.close();
        }
    }
}

/**
 * @desc Returns API response from cache
 * @param {string} endPoint - endPoint of the file location
 * @returns {Object|null} - returns object saved in cache
 * */
function getCache(endPoint) {
    if (endPoint.indexOf('?') > -1) {
        return null;
    }

    var fullFileName = getFullFileName(endPoint);
    var cacheFile = new File(fullFileName);
    var fileContent = '';

    if (cacheFile.exists()) {
        var charCount = 10000;
        var fileReader = new FileReader(cacheFile);
        var chunk;

        try {
            while (chunk = fileReader.readN(charCount)) {
                fileContent += chunk;
            }
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while reading content from cache for end point: ' + endPoint);
        }

        fileReader.close();
    }

    var fileContentObj;

    if (fileContent) {
        try {
            fileContentObj = JSON.parse(fileContent);
        } catch (e) {
            Logger.error('Error on parsing cache content of file ' + endPoint);
            Logger.error(e.message);
        }
    }

    return fileContentObj ? fileContentObj : null;
}

/**
 * @desc Returns API response from cache
 * @param {string} endPoint - endPoint of the file location
 * @returns {Object|null} - returns the time as per the cache
 * */
function getCacheTime(endPoint) {
    if (endPoint.indexOf('?') > -1) {
        return null;
    }

    var fullFileName = getFullFileName(endPoint);
    var cacheFile = new File(fullFileName);

    if (cacheFile.exists()) {
        var fileContent = '';
        var charCount = 10000;
        var fileReader = new FileReader(cacheFile);
        var chunk;

        try {
            while (chunk = fileReader.readN(charCount)) {
                fileContent += chunk;
            }
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while reading content from cache for end point: ' + endPoint);
        }

        fileReader.close();

        if (fileContent) {
            try {
                var calendar = new Calendar();
                calendar.parseByFormat(fileContent, "yyyy-MM-dd'T'HH:mm:ss'Z'");

                return calendar.getTime(); // eslint-disable-line consistent-return
            } catch (e) {
                Logger.error(e.getMessage());
                Logger.error('Error while parsing the cache content to JSON for file: ' + endPoint);
            }
        }
    }

    return null;
}

/* Exported functions */
module.exports = {
    setCache: setCache,
    getCache: getCache,
    getCacheTime: getCacheTime
};
