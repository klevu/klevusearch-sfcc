'use strict';

/* API Includes */
const Site = require('dw/system/Site');
const File = require('dw/io/File');
const Calendar = require('dw/util/Calendar');
const ProductMgr = require('dw/catalog/ProductMgr');
const StringUtils = require('dw/util/StringUtils');

/* Script Includes */
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const deletedXmlUtils = require('~/cartridge/scripts/utils/deletedXmlUtils');
const CsvReader = require('~/cartridge/scripts/utils/csvReader');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuExportDeletedProducts');

/* Global variables */
const config = klevuUtils.config;
const timeStamp = StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmss');

/**
 * Runs the relevant functions
 */
function run() {
    var itemGroupIdToItemId = Site.getCurrent().getCustomPreferenceValue('klevuItemGroupIdToItemId') || false;
    var isPrependFlag = (itemGroupIdToItemId && itemGroupIdToItemId.value === "true");

    var directory = new File(StringUtils.format(config.baseKlevuPath + config.sentProductsPath, Site.getCurrent().ID));

    if (directory && directory.isDirectory()) {
        var filesList = directory.listFiles(function (file) {
            return file.isFile();
        });
        if (filesList && filesList.size()) {
            var csvWriter = new CsvWriter(config.sentProductsHeader);
            csvWriter.initializeCSVStreamWriter(
                StringUtils.format(config.baseKlevuPath + config.sentProductsPath, Site.getCurrent().ID),
                StringUtils.format(config.sentProductsFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
            );
            var xmlWriter = deletedXmlUtils.createXML(StringUtils.format(config.deletedProductsFileName, timeStamp));
            var iterator = filesList.iterator();
            var file;

            while (iterator.hasNext()) {
                file = iterator.next();
                var csvReader = new CsvReader(file);
                csvReader.readHeader();
                var line;

                while ((line = csvReader.readLine()) !== null) { // eslint-disable-line no-cond-assign
                    if (config.sentProductsHeader in line && line[config.sentProductsHeader]) {
                        var productMaster = null, productMasterId = null;
                        var product = ProductMgr.getProduct(line[config.sentProductsHeader]);
                        // Add the master product ID to the delete xml feed
                        if(product && product.isVariant()) {
                            productMaster = product.getVariationModel().getMaster();
                            productMasterId = productMaster.ID;
                        }
                        if (!product || !product.onlineFlag || (productMaster && !empty(productMaster) && !productMaster.onlineFlag)) {
                            deletedXmlUtils.writeRecord(xmlWriter.xsw, line[config.sentProductsHeader], productMasterId , isPrependFlag);
                            Logger.info('Products deleted : {0}', (productMaster && !empty(productMaster)) ? productMasterId + ' : ' + line[config.sentProductsHeader] : line[config.sentProductsHeader]);
                        } else {
                            csvWriter.writeLine(line[config.sentProductsHeader]);
                        }
                    }
                }
                file.remove();
            }
            deletedXmlUtils.closeXML(xmlWriter.file, xmlWriter.xsw, xmlWriter.fw, config.productObject);
            csvWriter.closeStream();
        }
    }
}

module.exports = {
    Run: run
};