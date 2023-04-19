'use strict';

/* API Includes */
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const FileReader = require('dw/io/FileReader');
const XMLStreamReader = require('dw/io/XMLStreamReader');
const XMLStreamConstants = require('dw/io/XMLStreamConstants');
const XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');

/* Script Includes */
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');

/* Global Variables */
const config = klevuUtils.config;
const Logger = LogUtils.getLogger('deletedXmlUtils');
var deletedXmlUtils = {};
var recordsList = [];
/**
 * Function to check and delete empty file
 * @param {dw.io.File} file - object
 * @returns {void}
 */
function checkEmptyFile(file) {
    if (file && file.exists() && file.isFile()) {
        var fr = new FileReader(file, 'UTF-8');
        var xsr = new XMLStreamReader(fr);
        var isItemElementPresent = false;

        while (xsr.hasNext()) {
            if (xsr.next() === XMLStreamConstants.START_ELEMENT) {
                var localElementName = xsr.getLocalName();

                if (localElementName === 'record') {
                    isItemElementPresent = true;
                    break;
                }
            }
        }
        if (xsr !== null) {
            xsr.close();
        }
        if (fr !== null) {
            fr.close();
        }
        if (!isItemElementPresent) {
            file.remove();
        }
    }
}

/**
 * Creates the deleted products XML
 *
 * @param {string} fileName - file name
 * @returns {Object} object containing file and xml writers
 */
deletedXmlUtils.createXML = function (fileName) {
    var folderPath = klevuUtils.getKlevuPath(config.fileUploadPath);
    var folder = new File(folderPath);
    var file = new File(folderPath + File.SEPARATOR + fileName);
    var fw;
    var xsw;

    if (!folder.exists()) {
        try {
            folder.mkdirs();
        } catch (e) {
            Logger.error(e.getMessage());
            Logger.error('Error while making folders for the file: ' + fileName);
        }
    }
    file.createNewFile();

    try {
        fw = new FileWriter(file, 'UTF-8');
        xsw = new XMLIndentingStreamWriter(fw);
        // XML definition & first node
        xsw.writeStartDocument();
        xsw.writeStartElement('records');
    } catch (e) {
        throw new Error('ERROR : While writing XML product required attributes file : ' + e.stack + ' with Error: ' + e.message);
    }
    return {
        file: file,
        xsw: xsw,
        fw: fw
    };
};

/**
 * Writes the ID of the deleted item to XML
 *
 * @param {dw.io.XMLIndentingStreamWriter} xsw - xml writer
 * @param {string} record - ID of the record
 * @param {string | null} masterProductId - ID of the master product
 */
deletedXmlUtils.writeRecord = function (xsw, record, masterProductId, isPrependFlag) {
    if (recordsList.indexOf(record) === -1) {
        recordsList.push(record);
        xsw.writeStartElement('record');
        xsw.writeStartElement('id');
        if(isPrependFlag && masterProductId && !empty(masterProductId)) {
            xsw.writeCharacters(masterProductId + '-' + record);
        } else {
            xsw.writeCharacters(record);
        }
        xsw.writeEndElement();
        // Add the master product id for variants in the delete job
        if(masterProductId && !empty(masterProductId)) {
            xsw.writeStartElement('item_group_id');
            xsw.writeCharacters(masterProductId);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();
    }
};

/**
 * Function that closes the xml file
 *
 * @param {dw.io.File} file - file object
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.io.FileWriter} fw - file writer
 * @param {string} objectType - objectType
 */
deletedXmlUtils.closeXML = function (file, xsw, fw, objectType) {
    xsw.writeEndElement();
    xsw.writeEndDocument();
    xsw.flush();

    if (xsw !== null) {
        xsw.close();
    }
    if (fw !== null) {
        fw.close();
    }
    checkEmptyFile(file);

    if (file && file.exists() && file.isFile()) {
        klevuUtils.compressFile(file.getFullPath());
        klevuJobUtils.pushDataFileName(file.getName(), config.jobModeDelete, objectType);
    }
};

module.exports = deletedXmlUtils;
