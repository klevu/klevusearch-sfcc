'use strict';

/* API Includes*/
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const URLUtils = require('dw/web/URLUtils');
const Site = require('dw/system/Site');

/* Script Includes*/
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('contentAssetsUtils');

/* Global Variables*/
var config = klevuUtils.config;
var timeStamp = StringUtils.formatCalendar(new Calendar(new Date()), 'yyyyMMddHHmmss');
var fw;
var fullFileName;

/**
 * Function to retrieve content attributes
 * @return {Array} all the required fields
 */
function getContentAttributes() {
    var requiredFields = [];
    requiredFields.push('id', 'item_type', 'title', 'link', 'published_at', 'description');

    return requiredFields;
}

/**
 * Function to calculate content attributes values
 * @param {dw.content.Content} content - contentasset
 * @return {Object} all the required fields
 */
function calculateContentFields(content) {
    var itemType = config.klevuCMS;
    var contentID = content ? (config.contentPrefix + content.ID) : '';
    var link = URLUtils.https(config.pageShow, config.cid, content.ID);
    var title = content ? content.name : '';
    var publishedDate = content ? StringUtils.formatCalendar(new Calendar(content.creationDate), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ') : '';
    var contentBody = (content && content.custom.body) ? content.custom.body.source : '';

    Logger.info(contentID);

    return {
        id: contentID,
        item_type: itemType,
        title: title,
        link: link,
        published_at: publishedDate,
        description: contentBody
    };
}
/**
 * Utility class for content assets
 */
let contentAssetsUtils = {
    /**
     * Function for delta content export
     * @param {List} content - object
     * @returns {Object} calculated fields values
     */
    deltaExport: function (content) {
        let customCache = require('~/cartridge/scripts/utils/customCacheWebdav');
        let SEP = File.SEPARATOR;
        let objectTypeName = config.contentObject;
        let endPoint = Site.getCurrent().getID() ? Site.getCurrent().getID() + SEP + objectTypeName : objectTypeName;
        var response = null;

        if (content.lastModified.getTime() > customCache.getCacheTime(endPoint) && content.onlineFlag) {
            response = calculateContentFields(content);
        }

        return response;
    },

     /**
     * Function to get fields
     * @param {List} content - object
     * @returns {Object} calculated fields values
     */
    getContentFields: function (content) {
        var response = calculateContentFields(content);

        return response;
    },

    /**
     * Function that writes data to xml file
     * @param {Collection} lines - Actual payload for third party system
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {Object} csvWriter - csv file
     * @returns {void}
     */
    writeData: function (lines, xsw, csvWriter) {
        var allFields = getContentAttributes();

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let j;

            if (line) {
                xsw.writeStartElement('item');

                for (j = 0; j < allFields.length; j++) {
                    xsw.writeStartElement(allFields[j]);
                    xsw.writeCharacters(line[allFields[j]]);
                    xsw.writeEndElement();
                }

                xsw.writeEndElement();
                csvWriter.writeLine(line.id);
            }
        }
    },

    /**
     * Function that creates the xml file
     * @param {boolean} isFullExport - full export or delta export
     * @param {string} objectType - objectType
     * @returns {dw.io.XMLStreamWriter} xsw - xml file
     */
    createXml: function (isFullExport, objectType) {
        var folderPath = klevuUtils.getKlevuPath(config.fileUploadPath);
        var fileName = String.concat(config.filePrepend, isFullExport ? config.contentFullExport : config.contentDeltaExport, timeStamp, '.xml');
        var exportMode = isFullExport ? config.jobTypeFull : config.jobTypeDelta;
        fullFileName = folderPath + File.SEPARATOR + fileName;
        klevuJobUtils.pushDataFileName(fileName, exportMode, objectType);
        var file = new File(fullFileName);
        var xsw;
        var folder = new File(folderPath);

        if (!folder.exists()) {
            try {
                folder.mkdirs();
            } catch (e) {
                Logger.error(e.getMessage());
                Logger.error('Error while making folders for the file: ' + fileName);
            }
        }

        if (!file.exists()) {
            file.createNewFile();
        }

        try {
            fw = new FileWriter(file, 'UTF-8');
            xsw = new XMLIndentingStreamWriter(fw);
            // XML definition & first node
            xsw.writeStartDocument();
            xsw.writeStartElement('rss');
            xsw.writeAttribute('version', '2.0');
            xsw.writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
            xsw.writeAttribute('xsi:noNamespaceSchemaLocation', 'schema.xsd');
            xsw.writeStartElement('channel');
        } catch (e) {
            throw new Error('ERROR : While writing Xml content assest file : ' + e.stack + ' with Error: ' + e.message);
        }

        return xsw;
    },

    /**
     * Function that closes the xml file
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {boolean} isFullExport - full export or delta export
     * @returns {void}
     */
    closeXml: function (xsw) {
        // close xml Library
        xsw.writeEndElement();
        xsw.writeEndElement();
        xsw.writeEndDocument();
        xsw.flush();

        if (xsw !== null) {
            xsw.close();
        }
        if (fw !== null) {
            fw.close();
        }

        klevuUtils.compressFile(fullFileName);
    }
};

module.exports = contentAssetsUtils;
