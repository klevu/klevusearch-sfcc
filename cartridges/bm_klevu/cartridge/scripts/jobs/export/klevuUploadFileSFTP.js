'use strict';

/* API Includes */
var File = require('dw/io/File');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuUploadFileSFTP');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const klevuHttpServiceInit = require('*/cartridge/scripts/service/klevuHttpServiceInit');

/* Global Variables */
var sftpCredentials;
var serviceCredentials;
var config = klevuUtils.config;
var klevuNotifyURL;
/**
 * Delete the compressed xml file after sending it to SFTP server
 * @param {File} fileToBeDeleted file to be deleted after uploading it to SFTP
 * @returns {void}
 */
function delProcessedXmlFile(fileToBeDeleted) {
    if (fileToBeDeleted.isFile()) {
        fileToBeDeleted.remove();
        Logger.info('Files removed successfully from impex after its been uploaded into SFTP');
    }
}

/**
 * Transfer file to SFTP location
 * @param {File} file to transfer
 * @param {string} remoteServerPath location where file needs to be uploaded
 * @returns {void}
 */
function fileTransferToSFTP(file, remoteServerPath) {
    var sftpUtils = require('~/cartridge/scripts/utils/klevuSFTPUtils');
    var putBinary = sftpUtils.putBinary(remoteServerPath, file, file.name, sftpCredentials);

    if (putBinary) {
        delProcessedXmlFile(file);
        Logger.info('File uploaded to SFTP: ' + file.name);
    } else {
        Logger.error('FAILED to upload file - {0}', file.name);
        throw new Error('Job can not upload files to SFTP server. Please review log files');
    }
}

/**
 * retrieve files either from upload/job folder in impex
 * @param {Object} filesList list of files
 * @param {string} remoteServerPath location where file needs to be uploaded
 * @returns {void}
 */
function getFileBasedOnFolder(filesList, remoteServerPath) {
    if (filesList.getLength() > 0) {
        var filesIterator = filesList.iterator();

        while (filesIterator.hasNext()) {
            var file = filesIterator.next();

            if (file.isFile()) {
                var dots = file.name.split('.');

                if (dots[dots.length - 1] === config.compressedFileExtension || dots[dots.length - 1] === config.dataFileExtension) {
                    try {
                        fileTransferToSFTP(file, remoteServerPath);
                    } catch (exception) {
                        throw new Error('ERROR : while uploading file to SFTP server : ' + exception.stack + ' with Error: ' + exception.message);
                    }
                }
            }
        }
    }
}

/**
 * upload data zip files to Klevu's SFTP server
 * @returns {void}
 */
function uploadDataFiles() {
    try {
        var remoteServerPathOfData = File.SEPARATOR + config.fileUploadPath;
        var dataSourceFolderPath = klevuUtils.getKlevuPath(config.fileUploadPath);
        var dataFilesFolder = new File(dataSourceFolderPath);
        var dataFilesList = dataFilesFolder.listFiles();
        getFileBasedOnFolder(dataFilesList, remoteServerPathOfData);
        Logger.info('uploaded data files to SFTP successfully');
    } catch (exception) {
        throw new Error('ERROR : while uploading Data Xml files : ' + exception.stack + ' with Error: ' + exception.message);
    }
}

/**
 * upload data zip files to Klevu's SFTP server
 * @returns {void}
 */
function uploadJobFiles() {
    try {
        var remoteServerPathOfjob = File.SEPARATOR + config.jobFileUploadPath;
        var jobSourceFolderPath = klevuUtils.getKlevuPath(config.jobFileUploadPath);
        var jobFilesFolder = new File(jobSourceFolderPath);
        var jobFilesList = jobFilesFolder.listFiles();
        getFileBasedOnFolder(jobFilesList, remoteServerPathOfjob);
        Logger.info('uploaded job files to SFTP successfully');
    } catch (exception) {
        throw new Error('ERROR : while uploading Job Xml files : ' + exception.stack + ' with Error: ' + exception.message);
    }
}

/**
 * call klevu API and notify that data and job files are uploaded successfully
 * @returns {void}
 */
function notifyKlevu() {
    var response;
    try {
        response = klevuHttpServiceInit.serviceCall(config.serviceMethod, null, null,
                                         config.backofficeHttpServiceName,
                                         serviceCredentials.restKey,
                                         serviceCredentials.apiKey,
                                         false,
                                         klevuNotifyURL,
                                         true);
    } catch (exception) {
        throw new Error('ERROR : while calling service to notify Klevu about the file uploads' + exception.stack + ' with Error: ' + exception.message);
    }
    Logger.info('Klevu notify Klevu API call response ' + response);
}

/**
 * upload data zip files to Klevu's SFTP server
 * @returns {void}
 */
function uploadFiles() {
    var response;
    try {
        serviceCredentials = klevuUtils.getCustomPrefConfig();
        response = klevuHttpServiceInit.serviceCall(config.serviceMethod, null, null,
                                                           config.backofficeHttpServiceName,
                                                           serviceCredentials.restKey,
                                                           serviceCredentials.apiKey,
                                                           true);
        sftpCredentials = JSON.parse(response);
        klevuNotifyURL = (sftpCredentials && sftpCredentials.notifyUrl) ? sftpCredentials.notifyUrl : '';

        // upload both data and job Xml files to SFTP
        uploadDataFiles();
        uploadJobFiles();
    } catch (exception) {
        throw new Error('ERROR : Calling service to fetch SFTP details or while uploading xml files' + exception.stack + ' with Error: ' + exception.message);
    }

    // once the data/job files are uploaded, notify Klevu that the files are ready
    notifyKlevu();
}

module.exports = {
    uploadFiles: uploadFiles
};
