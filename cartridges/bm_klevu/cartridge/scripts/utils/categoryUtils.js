'use strict';

/* API Includes */
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const URLUtils = require('dw/web/URLUtils');
const Site = require('dw/system/Site');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('categoryUtils');
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');

/* Global Variables*/
var config = klevuUtils.config;
var timeStamp = StringUtils.formatCalendar(new Calendar(new Date()), 'yyyyMMddHHmmss');
var fw;
var fullFileName;

/**
 * Function to retrieve category attributes
 * @return {Array} all the required fields
 */
function getCategoryAttributes() {
    var requiredFields = [];
    requiredFields.push('id', 'item_type', 'title', 'link', 'image_link');

    return requiredFields;
}

/**
 * Function to retrieve category url
 * @param {dw.catalog.Category} category - object
 * @return {string} category url
 */
function getCategoryUrl(category) {
    var formattedURL = URLUtils.https(config.searchShow, config.cgid, category.getID()).toString();
    var siteHost = Site.current.httpsHostName;

    if (category.custom && 'alternativeUrl' in category.custom &&
        category.custom.alternativeUrl) {
        formattedURL = (category.custom.alternativeUrl).toString();
        if (formattedURL.indexOf(siteHost) === -1) {
            formattedURL = formattedURL.indexOf('/') === 0 ? (siteHost + formattedURL) : (siteHost + '/' + formattedURL);
        }
        if (formattedURL.indexOf('http') === -1 && formattedURL.indexOf('https') === -1) {
            formattedURL = (config.siteProtocol) + formattedURL;
        }
    }
    return formattedURL;
}

/**
 * Utility class for products
 */
let categoryUtils = {

    /**
     * Function to get category fields
     * @param {dw.catalog.Category} category - object
     * @returns {Object} calculated fields values
    */
    getcategoryFields: function (category) {
        var itemType = config.klevuCategory;
        var catSku = category ? (config.catPrefix + category.ID) : '';
        var title = category ? category.displayName : '';
        var link = getCategoryUrl(category);
        var imageLink = (category && category.image) ? category.image.httpsURL : '';

        return {
            id: catSku,
            item_type: itemType,
            title: title,
            link: link,
            image_link: imageLink
        };
    },

    /**
     * Function to get all underlying subcategories of a root category, in a single array
     * @param {string} root - root category
     * @returns {Object} category details
     */
    getAllSubCategories: function (root) {
        var output = [];
        var subCategories = root.getSubCategories();

        for (var index = 0; index < subCategories.length; index++) {
            var category = subCategories[index];

            if (category && category.isOnline()) {
                output.push(category);
                var nextLevelCategories = categoryUtils.getAllSubCategories(category);
                output.push.apply(output, nextLevelCategories);
            }
        }

        return output;
    },

    /**
     * Function that writes data to xml file
     * @param {Collection} lines - Actual payload for 3rd party system
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {Object} csvWriter - csv writer
     * @returns {void}
     */
    writeData: function (lines, xsw, csvWriter) {
        var allFields = getCategoryAttributes();

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let j;
            xsw.writeStartElement('item');

            for (j = 0; j < allFields.length; j++) {
                xsw.writeStartElement(allFields[j]);
                xsw.writeCharacters(line[allFields[j]]);
                xsw.writeEndElement();
            }

            xsw.writeEndElement();
            csvWriter.writeLine(line.id);
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
        var fileName = String.concat(config.filePrepend, isFullExport ? config.categoryFullExport : config.categoryDeltaExport, timeStamp, '.xml');
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
            throw new Error('ERROR : While writing XML categories of the site catalog : ' + e.stack + ' with Error: ' + e.message);
        }
        Logger.info('Category Xml created successfully');
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

module.exports = categoryUtils;
