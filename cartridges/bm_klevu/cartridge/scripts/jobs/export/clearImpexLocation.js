'use strict';

var File = require('dw/io/File');
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
var config = klevuUtils.config;

/**
 * Clears a directory
 * @param {dw.io.File} folder - folder to clear
 */
function clearDirectory(folder) {
    if (!folder.exists()) {
        return;
    }
    if (folder.isDirectory()) {
        var ARCHIVE_DIRECTORY = klevuUtils.getKlevuPath(config.archivedFilesPath) + File.SEPARATOR;
        var archiveDirectory = new File(ARCHIVE_DIRECTORY);

        if (!archiveDirectory.exists()) {
            archiveDirectory.mkdirs();
        }

        var filesList = folder.listFiles();

        for (var i = 0; i < filesList.length; i++) {
            var file = filesList[i];
            file.renameTo(new File(ARCHIVE_DIRECTORY + file.getName()));
        }
    }
}

/**
 * Clears Impex Location
 */
function clearImpex() {
    clearDirectory(new File(klevuUtils.getKlevuPath(config.fileUploadPath)));
    clearDirectory(new File(klevuUtils.getKlevuPath(config.jobFileUploadPath)));
}

module.exports = {
    clearImpex: clearImpex
};
