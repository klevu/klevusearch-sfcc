'use strict';

/* API Includes */
const File = require('dw/io/File');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuSFTPUtils');

/* Global Variables */
var SFTPUtils = {};

// upload binary file to SFTP server
SFTPUtils.putBinary = function (remoteServerPath, compressedFile, fileName, sftpCredentials) {
    var ServiceClient = require('dw/net/SFTPClient');
    var client = new ServiceClient();
    client.setTimeout(29000);

    var result = false;
    var connected = client.connect(sftpCredentials.host, sftpCredentials.user, sftpCredentials.password);

    if (connected) {
        result = client.putBinary(remoteServerPath + File.SEPARATOR + fileName, compressedFile);

        if (!result) {
            Logger.error('Some problems uploading file to SFTP: ' + client.errorMessage);
        }
    } else {
        Logger.error('Some problems connecting SFTP: ' + client.errorMessage);
    }

    return result;
};

module.exports = SFTPUtils;
