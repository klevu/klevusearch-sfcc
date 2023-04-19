'use strict';
/* global empty */

/* API Includes */
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
const XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');

/* Script Includes*/
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuJobUtils');
var customCacheWebdav = require('~/cartridge/scripts/utils/customCacheWebdav');

/* Global Variables*/
var config = klevuUtils.config;
var SEP = File.SEPARATOR;

var klevuJobUtils = {};
var fw;
var xsw;

/**
 * Create job xml which contains info about the respective data export job
 * @param {boolean} exportMode - full or delta or deleted
 * @param {string} objectType - object Type
 */
klevuJobUtils.createJobDetailsXml = function (exportMode, objectType) {
    var endPoint = klevuJobUtils.getJobContentEndPoint(exportMode, objectType);
    var jobContent = customCacheWebdav.getCache(endPoint);

    if (empty(jobContent)) {
        klevuJobUtils.initJobContent(exportMode);
        jobContent = customCacheWebdav.getCache(endPoint);
    }

    var jobStartTime = jobContent.timestamp;
    var filesNameList = jobContent.dataFiles;

    if (filesNameList && filesNameList.length > 0) {
        var folderPath = klevuUtils.getKlevuPath(config.jobFileUploadPath);
        var fileName = config.jobFileName + exportMode + (exportMode === config.jobTypeFull ? '' : ('-' + objectType)) + '-' + jobStartTime + '.' + config.dataFileExtension;
        var fullFileName = folderPath + File.SEPARATOR + fileName;
        var file = new File(fullFileName);
        var folder = new File(folderPath);
        var atleastOneDataFileExists = false;

        if (!folder.exists()) {
            try {
                folder.mkdirs();
            } catch (e) {
                Logger.error(e.getMessage());
                Logger.error('Error while creating folders for the file: ' + fullFileName);
            }
        }

        for (var j = 0; j < filesNameList.length; j++) {
            var dataFilePath = config.baseKlevuPath + config.fileUploadPath + SEP + filesNameList[j] + '.' + config.compressedFileExtension;
            var dataFile = new File(dataFilePath);
            if (dataFile.exists()) {
                atleastOneDataFileExists = true;
                break;
            }
        }

        if (!file.exists() && atleastOneDataFileExists) {
            file.createNewFile();
        }

        try {
            if (atleastOneDataFileExists) {
                klevuJobUtils.feedDataToFile(file, jobStartTime, filesNameList, exportMode, objectType);
            } else {
                Logger.info('No data files found to write into job xml');
            }
        } catch (e) {
            throw new Error('ERROR : While creating and writing data to jobs details xml : ' + e.stack + ' with Error: ' + e.message);
        }
    } else {
        Logger.info('No data files generated to create job xml');
        return;
    }
};

/**
 * write details in the job xml
 * @param {Object} file where the data needs to be written
 * @param {string} jobStartTime timestamp when the job started the execution
 * @param {string} filesNameList list of file's name to be uploaded
 * @param {boolean} exportMode - full or delta or deleted
 * @param {string} objectType - object Type
 */
klevuJobUtils.feedDataToFile = function (file, jobStartTime, filesNameList, exportMode, objectType) {
    var jobIdPrepend = config.jobFileName + (exportMode === 'full' ? config.jobTypeFull : config.jobTypeDelta) + (exportMode === 'full' ? '' : ('-' + objectType));
    try {
        fw = new FileWriter(file, 'UTF-8');
        xsw = new XMLIndentingStreamWriter(fw);
        // XML definition & first node
        xsw.writeStartDocument();

        xsw.writeStartElement('job');

        xsw.writeStartElement('jobId');
        xsw.writeCharacters(jobIdPrepend + '-' + jobStartTime);
        xsw.writeEndElement();

        xsw.writeStartElement('type');
        xsw.writeCharacters(exportMode === 'full' ? config.jobTypeFull : config.jobTypeDelta);
        xsw.writeEndElement();

        xsw.writeStartElement('jobStartTime');
        xsw.writeCharacters(jobStartTime);
        xsw.writeEndElement();

        xsw.writeStartElement('dataFiles');

        // write datafiles entry of multiple files created in a job execution
        klevuJobUtils.arrayOfDataFilesDetails(filesNameList, exportMode);

        xsw.writeEndElement();
        xsw.writeEndElement();
    } catch (e) {
        throw new Error('ERROR : while writing data into job xml based on the data files : ' + e.stack + ' with Error: ' + e.message);
    }

    xsw.writeEndDocument();
    xsw.flush();

    if (xsw !== null) {
        xsw.close();
    }
    if (fw !== null) {
        fw.close();
    }
    Logger.info('Respective Job details written into Job xml successfully');
};

/**
 * If there are multiple files created in a single job execution then push those array of data files details
 * @param {string} filesNameList list of file's name to be uploaded
 * @param {boolean} exportMode - full or delta or deleted
 */
klevuJobUtils.arrayOfDataFilesDetails = function (filesNameList, exportMode) {
    try {
        var dataFolderPath = SEP + config.fileUploadPath + SEP;
        for (var j = 0; j < filesNameList.length; j++) {
            var dataFilePath = config.baseKlevuPath + config.fileUploadPath + SEP + filesNameList[j] + '.' + config.compressedFileExtension;
            var dataFile = new File(dataFilePath);
            if (dataFile.exists()) {
                xsw.writeStartElement('dataFile');
                xsw.writeStartElement('fileName');
                xsw.writeCharacters(dataFolderPath + filesNameList[j] + '.' + config.compressedFileExtension);
                xsw.writeEndElement();
                xsw.writeStartElement('fileType');
                xsw.writeCharacters(exportMode === config.jobTypeFull || exportMode === config.jobTypeDelta ? config.dataExportType : config.jobModeDelete);
                xsw.writeEndElement();
                xsw.writeEndElement();
            }
        }
    } catch (e) {
        throw new Error('ERROR : while looping through the data files from upload folder : ' + e.stack + ' with Error: ' + e.message);
    }
};

/**
 * Push the data filename to array by adding compressed file extension to add into job file
 * @param {string} fileName original file name without compressed file extension
 * @param {boolean} exportMode - full or delta or deleted
 * @param {string} objectType - object Type
 */
klevuJobUtils.pushDataFileName = function (fileName, exportMode, objectType) {
    var endPoint = klevuJobUtils.getJobContentEndPoint(exportMode, objectType);
    var jobContent = customCacheWebdav.getCache(endPoint);

    if (empty(jobContent)) {
        klevuJobUtils.initJobContent(exportMode, objectType);
        jobContent = customCacheWebdav.getCache(endPoint);
    }

    jobContent.dataFiles.push(fileName);
    customCacheWebdav.setCache(endPoint, jobContent);
};

/**
 * Get the Job Content EndPoint
 * @param {boolean} exportMode - full or delta or deleted
 * @param {string} objectType - object Type
 * @return {string} end point
 * */
klevuJobUtils.getJobContentEndPoint = function (exportMode, objectType) {
    const Site = require('dw/system/Site');
    var endPoint = Site.getCurrent().getID() + SEP + config.jobFileUploadPath + SEP + config.jobFileName + exportMode + (exportMode === config.jobTypeFull ? '' : objectType);

    return endPoint;
};

/**
 * Init Job content
 * @param {boolean} exportMode - full or delta or deleted
 * @param {string} objectType - object Type
 * */
klevuJobUtils.initJobContent = function (exportMode, objectType) {
    var timeStamp = StringUtils.formatCalendar(new Calendar(new Date()), 'yyyyMMddHHmmss');
    var jobContent = {
        timestamp: timeStamp,
        dataFiles: []
    };
    var endPoint = klevuJobUtils.getJobContentEndPoint(exportMode, objectType);

    customCacheWebdav.setCache(endPoint, jobContent);
};

module.exports = klevuJobUtils;
