'use strict';

/* API Includes */
var File = require('dw/io/File');
var Site = require('dw/system/Site');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuJobUtils');

/* Global Variables*/
const SEP = File.SEPARATOR;

var klevuUtils = {};

klevuUtils.config = {
    baseKlevuPath: File.IMPEX + SEP + 'src' + SEP + 'klevu' + SEP,
    fileUploadPath: 'upload',
    sentProductsPath: 'sentItemsList' + SEP + '{0}' + SEP + 'products' + SEP, // replace {0} with SiteID
    sentProductsFileName: 'products_{0}.csv', // replace {0} with timestamp
    sentProductsHeader: 'productID',
    sentCategoriesPath: 'sentItemsList' + SEP + '{0}' + SEP + 'categories' + SEP, // replace {0} with SiteID
    sentCategoriesFileName: 'categories_{0}.csv', // replace {0} with timestamp
    sentCategoriesHeader: 'categoryID',
    sentContentPath: 'sentItemsList' + SEP + '{0}' + SEP + 'content' + SEP, // replace {0} with SiteID
    sentContentFileName: 'content_{0}.csv', // replace {0} with timestamp
    sentContentHeader: 'contentID',
    deletedProductsFileName: 'data-product-deleted-{0}.xml',
    deletedCategoriesFileName: 'data-category-deleted-{0}.xml',
    deletedContentFileName: 'data-content-deleted-{0}.xml',
    filePrepend: 'data-',
    jobTypeFull: 'full',
    jobTypeDelta: 'delta',
    jobModeDelete: 'delete',
    dataExportType: 'update',
    jobFileUploadPath: 'job',
    archivedFilesPath: 'archived',
    jobFileName: 'job-start-',
    categoryFullExport: 'category-full-export-',
    productFullExport: 'product-full-export-',
    contentFullExport: 'content-full-export-',
    categoryDeltaExport: 'category-delta-export-',
    productDeltaExport: 'product-delta-export-',
    contentDeltaExport: 'content-delta-export-',
    compressedFileExtension: 'zip',
    dataFileExtension: 'xml',
    backofficeHttpServiceName: 'klevu.http.backoffice',
    analyticsHttpServiceName: 'klevu.http.analytics',
    serviceMethod: 'GET',
    klevuProduct: 'KLEVU_PRODUCT',
    klevuCategory: 'KLEVU_CATEGORY',
    catPrefix: 'category-',
    contentPrefix: 'cms-',
    klevuCMS: 'KLEVU_CMS',
    root: 'root',
    specialChars: "<>@!#$%^&*()_+[]{}?:;|'\"\\,./~`-=",
    productObject: 'product',
    categoryObject: 'category',
    contentObject: 'contentAssets',
    systemAttr: 'system',
    productShow: 'Product-Show',
    searchShow: 'Search-Show',
    pageShow: 'Page-Show',
    pid: 'pid',
    cgid: 'cgid',
    cid: 'cid',
    size: 'size',
    color: 'color',
    inStock: 'in stock',
    outOfStock: 'out of stock',
    productTypeMaster: 'master',
    productTypeVariant: 'variant',
    productTypeVariationGroup: 'variationGroup',
    productTypeSet: 'set',
    productTypeBundle: 'bundle',
    productTypeOptionProduct: 'optionProduct',
    productTypeStandard: 'standard',
    siteProtocol: 'https://'
};

klevuUtils.getCustomPrefConfig = function () {
    var restKey = Site.current.getCustomPreferenceValue('klevuRestKey') || '';
    var apiKey = Site.current.getCustomPreferenceValue('klevuAPIKey') || '';

    if (restKey === '' || apiKey === '') {
        Logger.error('Error: Klevu Business Manager configurations are missing.');
    }

    var config = {
        restKey: restKey,
        apiKey: apiKey
    };

    return config;
};

/**
 * Returns the Klevu file path for the given relative path
 * @param {string} relativePath the relative path
 * @returns {string} the complete path
 */
klevuUtils.getKlevuPath = function (relativePath) {
    return this.config.baseKlevuPath + relativePath;
};

/**
 * Compresses the XML file to ZIP
 * @param {string} fullFileName full name of the XML file including folder path
 */
klevuUtils.compressFile = function (fullFileName) {
    var xmlFile = new File(fullFileName);
    var compressedFile = new File(fullFileName + '.' + this.config.compressedFileExtension);
    xmlFile.zip(compressedFile);
    Logger.info('File compressed successfully' + fullFileName);
    xmlFile.remove();
};

/**
 * Delete given directory and all files and sub-directories in it
 *
 * @param {dw.io.File} file directory to delete
 */
klevuUtils.deleteDirectory = function (file) {
    if (!file.exists()) {
        return;
    }
    if (!file.isDirectory()) {
        throw new Error('file instance is not directory');
    }

    var fileNames = file.list();

    for (var i = 0; i < fileNames.length; i++) {
        var filePath = file.getFullPath() + File.SEPARATOR + fileNames[i];
        var processedFile = new File(filePath);

        if (processedFile.isDirectory()) {
            this.deleteDirectory(processedFile);
        } else {
            processedFile.remove();
        }
    }

    file.remove();
};

/**
 * Returns the flag settings in Business Manager
 * @returns {boolean} isPrependFlag The status of the flag set in BM
 */
klevuUtils.getPrependFlag = function() {
    var isPrependFlag = false;
    try {
        var itemGroupIdToItemId = Site.getCurrent().getCustomPreferenceValue('klevuItemGroupIdToItemId') || false;
        isPrependFlag = (itemGroupIdToItemId && itemGroupIdToItemId.value === "true");
    } catch (e) {

    }
    return isPrependFlag;
}

module.exports = klevuUtils;