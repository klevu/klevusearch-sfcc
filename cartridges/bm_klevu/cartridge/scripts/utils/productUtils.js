'use strict';

/* global empty, session */
/* eslint no-unused-expressions: 0 */
/* eslint-disable no-shadow */
/* eslint  no-param-reassign:0 */
/* eslint  no-useless-concat:0 */
/* eslint  consistent-return:0 */

/* API Includes*/
const Site = require('dw/system/Site');
const PromotionMgr = require('dw/campaign/PromotionMgr');
const Promotion = require('dw/campaign/Promotion');
const Money = require('dw/value/Money');
const Currency = require('dw/util/Currency');
const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
const Calendar = require('dw/util/Calendar');
const StringUtils = require('dw/util/StringUtils');
const FileReader = require('dw/io/FileReader');
const XMLStreamReader = require('dw/io/XMLStreamReader');
const XMLStreamConstants = require('dw/io/XMLStreamConstants');
const SystemObjectMgr = require('dw/object/SystemObjectMgr');
const ObjectAttributeDefinition = require('dw/object/ObjectAttributeDefinition');

/* Script Includes*/
const CsvWriter = require('~/cartridge/scripts/utils/csvWriter');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('productUtils');
const priceBookHelpers = require('*/cartridge/scripts/helpers/klevuPriceBookHelpers');
var currencyHelpers = require('*/cartridge/scripts/helpers/klevuCurrencyHelpers');
var productHelpers = require('*/cartridge/scripts/helpers/klevuProductHelpers');

/* Global Variables*/
var timeStamp = StringUtils.formatCalendar(new Calendar(new Date()), 'yyyyMMddHHmmss');
var config = klevuUtils.config;
var fw;
var file;
var fileType;
var fullFileName;
var dynamicProductAttributes;
var optionalProductAttributes;
var processedFacetAlready = false;
var objectTypeName = config.productObject;
var productDefinition = SystemObjectMgr.describe('Product');
var fileNamesList = [];
var counter = 0;
var filesCounter = 0;
var simpleProductsWrittenSuccessfully = 0;
var priceDataInDeltaExport = false;

/**
 * Function that checks for special characters
 * @param {string} string - name of category
 * @return {boolean} true/false
 */
function checkForSpecialChar(string) {
    var specialChars = config.specialChars;

    for (var i = 0; i < specialChars.length; i++) {
        if (string.indexOf(specialChars[i]) > -1) {
            return true;
        }
    }

    return false;
}

/**
 * Function that retrieves list of all online categories of a product
 * @param {Object} category - category object
 * @param {dw.catalog.Category} categories - online categories
 * @return {dw.catalog.Category} categories - return all assinged categories list
 */
function getAllParentCategories(category, categories) {
    if (category.root !== true) {
        categories.push(category.getDisplayName());
    }

    var parentCat = category.parent;
    if (parentCat && parentCat.root !== true) {
        getAllParentCategories(parentCat, categories);
    }
    return categories;
}

/**
 * Function that write category specific data in xml
 * @param {dw.catalog.Category} cats - online categories
 * @param {dw.io.XMLStreamWriter} xsw - xml file writer
 * @return {void}
 */
function writeCategories(cats, xsw) {
    var categories;

    var catIterator = cats.iterator();
    var category;
    while (catIterator.hasNext()) {
        category = catIterator.next();
        categories = [];
        categories = getAllParentCategories(category, categories);

        if (!empty(categories)) {
            categories.reverse();
            xsw.writeStartElement('category');

            categories.forEach(function (path) {
                xsw.writeStartElement('path');
                checkForSpecialChar(path) ? xsw.writeCData(path) : xsw.writeCharacters(path);
                xsw.writeEndElement();
            });

            xsw.writeEndElement();
        }
    }
}

/**
 * Function to retrieve mandatory product fields
 * @return {Array} all the mandatory fields
 */
function getMandatoryProductAttributes() {
    var requiredFields = [];
    var requiredSytemFields = [];
    var requiredCustomFields = [];

    var mandatoryProductAttributes = Site.current.getCustomPreferenceValue('klevuMandatoryProductAttributes');

    if (empty(mandatoryProductAttributes)) {
        Logger.error("'Product Attributes Mapping Mandatory' is missing from site preferences");
        throw new Error("'Product Attributes Mapping Mandatory' is missing from site preferences");
    }

    mandatoryProductAttributes = JSON.parse(mandatoryProductAttributes);

    mandatoryProductAttributes.forEach(function (attr) {
        attr.sfcc_type === config.systemAttr ? requiredSytemFields.push(attr.klevu_id + '-' + attr.sfcc_id) : requiredCustomFields.push(attr.klevu_id + '-' + attr.sfcc_id);
    });

    requiredFields.push('item_group_id', 'item_type', 'sku', 'link', 'availability', 'categories', 'price', 'sale_price', 'image_link', 'additional_image_link');

    return {
        requiredFields: requiredFields,
        requiredSytemFields: requiredSytemFields,
        requiredCustomFields: requiredCustomFields
    };
}

/**
 * Function to retrieve price object of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @return {Object} price object
 */
function getPrice(product) {
    return productHelpers.getPrice(product);
}

/**
 * Function to retrieve list price of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.catalog.PriceBook} priceBook - price book
 * @return {Object} price object
 */
function getListPrice(product, priceBook) {
    return productHelpers.getListPrice(product, priceBook);
}

/**
 * Function to calculate standard price of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.catalog.PriceBook} priceBook - price book
 * @param {dw.catalog.PriceBook} priceBookCurrency - price book currency
 * @return {string} price of product
 */
function getProductPrice(product, priceBook, priceBookCurrency) {
    let price = getListPrice(product, priceBook);
    let result = '0.00' + ' ' + priceBookCurrency;

    if (price && price.valueOrNull) {
        result = price.valueOrNull + ' ' + price.currencyCode;
    }
    return result;
}

/**
 * Function to calculate sale price of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.catalog.PriceBook} priceBookCurrency - price book currency
 * @return {string} sale price of product
 */
function getProductSalePrice(product, priceBookCurrency) {
    let price = getPrice(product);

    var promos = PromotionMgr.activePromotions.getProductPromotions(product);
    var promoPrice = Money.NOT_AVAILABLE;
    var salesPrice = price;

    if (!(empty(promos))) {
        var promo = promos[0];
        var promoClass = promo.getPromotionClass();

        if (promoClass && promoClass.equals(Promotion.PROMOTION_CLASS_PRODUCT)) {
            promoPrice = promo.getPromotionalPrice(product);
        }
    }

    if (promoPrice.available && price.compareTo(promoPrice) !== 0) {
        salesPrice = promoPrice;
    }

    if (salesPrice && salesPrice.valueOrNull) {
        salesPrice = salesPrice + ' ' + salesPrice.currencyCode;
    } else {
        salesPrice = '0.00' + ' ' + priceBookCurrency;
    }
    return salesPrice;
}

/**
 * Function to write attribute value based on data type
 * @param {dw.object.ObjectAttributeDefinition} attributeDef - object
 * @param {string} attrValue - attribute value
 * @param {dw.io.XMLStreamWriter} xsw - XML stream writer
 * @return {void}
 */
function writeAttributeValue(attributeDef, attrValue, xsw) {
    if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_HTML) {
        xsw.writeCData(attrValue);
    } else {
        xsw.writeCharacters(attrValue);
    }
}

/**
 * Function to write dynamic config attributes of type enum
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.object.ObjectAttributeDefinition} attributeDef - object
 * @param {string} attributeID - Attribute ID
 * @param {Object} attributeValues - Attribute Values
 * @return {void}
 */
function writeDynamicMultipleValueAttributes(xsw, attributeDef, attributeID, attributeValues) {
    if (attributeDef.multiValueType) {
        xsw.writeStartElement('values');
        for (var j = 0; j < attributeValues.length; j++) {
            xsw.writeStartElement('value');
            xsw.writeCharacters(attributeValues[j].displayValue);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();
    } else if (!empty(attributeValues.value)) {
        writeAttributeValue(attributeDef, attributeValues.displayValue, xsw);
    }
}

/**
 * Function to write attributes of type enum
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.object.ObjectAttributeDefinition} attributeDef - object
 * @param {string} attributeID - Attribute ID
 * @param {Object} attributeValues - Attribute Values
 * @return {void}
 */
function writeMultipleValueAttributes(xsw, attributeDef, attributeID, attributeValues) {
    if (attributeDef.multiValueType) {
        xsw.writeStartElement(attributeID);
        xsw.writeStartElement('values');
        for (var i = 0; i < attributeValues.length; i++) {
            xsw.writeStartElement('value');
            xsw.writeCharacters(attributeValues[i].displayValue);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();
        xsw.writeEndElement();
    } else if (!empty(attributeValues.value)) {
        xsw.writeStartElement(attributeID);
        writeAttributeValue(attributeDef, attributeValues.displayValue, xsw);
        xsw.writeEndElement();
    }
}

/**
 * Function to write dynamic config attributes of type set
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.object.ObjectAttributeDefinition} attributeDef - object
 * @param {string} attributeID - Attribute ID
 * @param {Object} attributeValues - Attribute Values
 * @return {void}
 */
function writeDynamicMultipleValueSetAttributes(xsw, attributeDef, attributeID, attributeValues) {
    if (attributeDef.multiValueType) {
        xsw.writeStartElement('values');
        for (var k = 0; k < attributeValues.length; k++) {
            xsw.writeStartElement('value');
            xsw.writeCharacters(attributeValues[k]);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();
    } else if (!empty(attributeValues.value)) {
        writeAttributeValue(attributeDef, attributeValues, xsw);
    }
}

/**
 * Function to write attributes of type set
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.object.ObjectAttributeDefinition} attributeDef - object
 * @param {string} attributeID - Attribute ID
 * @param {Object} attributeValues - Attribute Values
 * @return {void}
 */
function writeMultipleValueSetAttributes(xsw, attributeDef, attributeID, attributeValues) {
    if (attributeDef.multiValueType) {
        xsw.writeStartElement(attributeID);
        xsw.writeStartElement('values');
        for (var i = 0; i < attributeValues.length; i++) {
            xsw.writeStartElement('value');
            xsw.writeCharacters(attributeValues[i]);
            xsw.writeEndElement();
        }
        xsw.writeEndElement();
        xsw.writeEndElement();
    } else if (!empty(attributeValues.value)) {
        xsw.writeStartElement(attributeID);
        writeAttributeValue(attributeDef, attributeValues, xsw);
        xsw.writeEndElement();
    }
}
/**
 * Function to write product optional attributes
 * @param {Array} optionalProductAttributes - object
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @param {dw.object.ObjectTypeDefinition} productDefinition - product type object definition
 * @returns {void}
 */
function writeOptionalAttributes(optionalProductAttributes, product, xsw, productDefinition) {
    var optionalCustomFields = [];
    var optionalSystemFields = [];
    var customField = [];
    var systemField = [];
    var attributeDef;
    var systemAttrValue;
    var customAttrValue;

    optionalProductAttributes.forEach(function (attr) {
        attr.sfcc_type === config.systemAttr ? optionalSystemFields.push(attr.klevu_id + '-' + attr.sfcc_id) : optionalCustomFields.push(attr.klevu_id + '-' + attr.sfcc_id);
    });

    for (let j = 0; j < optionalSystemFields.length; j++) {
        systemField = optionalSystemFields[j].split('-');

        if (systemField[0] && systemField[1] && Object.prototype.hasOwnProperty.call(product, systemField[1])) {
            attributeDef = productDefinition ? productDefinition.getSystemAttributeDefinition(systemField[1]) : null;

            // check for attribute of type Date+Time and format it
            if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_DATETIME) {
                systemAttrValue = StringUtils.formatCalendar(new Calendar(product[systemField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
            } else {
                systemAttrValue = product[systemField[1]];
            }
            if (systemAttrValue) {
                xsw.writeStartElement(systemField[0]);
                writeAttributeValue(attributeDef, systemAttrValue, xsw);
                xsw.writeEndElement();
            }
        }
    }

    for (let j = 0; j < optionalCustomFields.length; j++) {
        customField = optionalCustomFields[j].split('-');

        if (customField[0] && customField[1] && Object.prototype.hasOwnProperty.call((product.custom), customField[1])) {
            attributeDef = productDefinition ? productDefinition.getCustomAttributeDefinition(customField[1]) : null;

            switch (attributeDef && attributeDef.valueTypeCode) {
            // check for attribute of type Date+Time and format it
            case ObjectAttributeDefinition.VALUE_TYPE_DATETIME:
                customAttrValue = StringUtils.formatCalendar(new Calendar(product.custom[customField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                xsw.writeStartElement(customField[0]);
                writeAttributeValue(attributeDef, customAttrValue, xsw);
                xsw.writeEndElement();
                break;
            // handle attributes of type enum
            case ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_STRING:
            case ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_INT:
                customAttrValue = product.custom[customField[1]];
                !empty(customAttrValue) ? writeMultipleValueAttributes(xsw, attributeDef, customField[0], customAttrValue) : '';
                break;
            // handle attributes of type set
            case ObjectAttributeDefinition.VALUE_TYPE_SET_OF_INT:
            case ObjectAttributeDefinition.VALUE_TYPE_SET_OF_NUMBER:
                customAttrValue = product.custom[customField[1]];
                !empty(customAttrValue) ? writeMultipleValueSetAttributes(xsw, attributeDef, customField[0], customAttrValue) : '';
                break;
            default:
                customAttrValue = product.custom[customField[1]];
                xsw.writeStartElement(customField[0]);
                writeAttributeValue(attributeDef, customAttrValue, xsw);
                xsw.writeEndElement();
            }
        }
    }
}

/**
 * Function to get the variation model of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @returns {Object} product variation model
 */
function getVariationModel(product) {
    return product.getVariationModel();
}

/**
 * Function to check if any category to which product is assigned is modified
 * @param {dw.catalog.Category} category - category object
 * @param {number} cachedTime - last modified time of category in previous job execution
 * @returns {boolean} categoryModified
 */
function checkIfAnyCategoryUpdated(category, cachedTime) {
    var categoryModified = false;

    if (category.lastModified.getTime() > cachedTime) {
        categoryModified = true;
    }
    var parentCat = category.parent;
    if (parentCat && categoryModified === false) {
        categoryModified = checkIfAnyCategoryUpdated(parentCat, cachedTime);
    }
    return categoryModified;
}

/**
 * Function to get the variation model of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {number} cachedTime - cache time
 * @returns {Object} product variation model
 */
function checkIfProductDataUpdated(product, cachedTime) {
    var dataUpdated = false;
    var categoryUpdated = false;
    var masterUpdated = false;
    var inventoryUpdated = false;
    var variationModel;
    var masterProd;

    // if it is variation product, verify its master product is updated or not
    if (product.isVariant()) {
        variationModel = product.isVariant ? getVariationModel(product) : null;
        masterProd = !empty(variationModel) ? variationModel.getMaster() : null;
        masterUpdated = (!empty(masterProd) && masterProd.lastModified.getTime()) > cachedTime;
    }

    // verify if product's inventory is updated
    var productInventoryLastModified = product.getAvailabilityModel().getInventoryRecord() ? product.getAvailabilityModel().getInventoryRecord().lastModified : null;
    inventoryUpdated = productInventoryLastModified && (productInventoryLastModified.getTime() > cachedTime);

    // verify if product's any of the assigned category is updated
    var categories = product.isVariant() ? masterProd.getOnlineCategories() : product.getOnlineCategories();

    if (!empty(categories)) {
        var catIterator = categories.iterator();
        var category;
        while (catIterator.hasNext()) {
            category = catIterator.next();
            categoryUpdated = checkIfAnyCategoryUpdated(category, cachedTime);

            if (categoryUpdated) {
                break;
            }
        }
    }

    if (product.lastModified.getTime() > cachedTime || inventoryUpdated || masterUpdated || categoryUpdated) {
        dataUpdated = true;
    }
    return dataUpdated;
}

/**
 * Function to write additional currencies
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {string} sfccId - attribute ID
 * @returns {string} value or empty
 */
function variationAttributesValue(product, sfccId) {
    let pvm = getVariationModel(product);
    let attrIter = pvm.productVariationAttributes.iterator();

    while (attrIter.hasNext()) {
        let attr = attrIter.next();

        if (attr.attributeID === sfccId) {
            let variantAttrValue = pvm.getVariationValue(product, attr);
            return !empty(variantAttrValue) ? (variantAttrValue.displayValue || variantAttrValue.value) : '';
        }
    }

    return '';
}

/**
 * Function to write product dynamic attributes
 * @param {Array} dynamicProductAttributes - object
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @returns {void}
 */
function writeDynamicAttributes(dynamicProductAttributes, product, xsw) {
    var attributeDef;

    for (var i = 0; i < dynamicProductAttributes.length; i++) {
        var isSearchable = false;
        var isReturn = false;
        var isFacet = false;
        var sfccId = dynamicProductAttributes[i].sfcc_id;

        if (Object.prototype.hasOwnProperty.call(dynamicProductAttributes[i], 'is_searchable')) {
            isSearchable = true;
        }

        if (Object.prototype.hasOwnProperty.call(dynamicProductAttributes[i], 'is_return')) {
            isReturn = true;
        }

        if (Object.prototype.hasOwnProperty.call(dynamicProductAttributes[i], 'is_facet')) {
            isFacet = true;
        }

        if (sfccId && sfccId in product.custom) {
            var attrValue;

            if (sfccId === config.size || sfccId === config.color) {
                attrValue = variationAttributesValue(product, sfccId);
            } else {
                attributeDef = productDefinition ? productDefinition.getCustomAttributeDefinition(sfccId) : null;

                if (attributeDef && attributeDef.multiValueType) {
                    attrValue = product.custom[sfccId];
                } else {
                    attrValue = product.custom[sfccId].toString();
                }
            }

            if (attrValue) {
                xsw.writeStartElement('attribute');
                xsw.writeStartElement('id');
                xsw.writeCharacters(sfccId);
                xsw.writeEndElement();

                if (isSearchable) {
                    xsw.writeStartElement('is_searchable');
                    xsw.writeCharacters(dynamicProductAttributes[i].is_searchable);
                    xsw.writeEndElement();
                }

                if (isReturn) {
                    xsw.writeStartElement('is_return');
                    xsw.writeCharacters(dynamicProductAttributes[i].is_return);
                    xsw.writeEndElement();
                }

                if (isFacet) {
                    xsw.writeStartElement('is_facet');
                    xsw.writeCharacters(dynamicProductAttributes[i].is_facet);
                    xsw.writeEndElement();
                }

                switch (attributeDef && attributeDef.valueTypeCode) {
                // check for attribute of type Date+Time and format it
                case ObjectAttributeDefinition.VALUE_TYPE_DATETIME:
                    var customAttrValue = StringUtils.formatCalendar(new Calendar(attrValue), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                    xsw.writeStartElement('values');
                    xsw.writeStartElement('value');
                    xsw.writeCharacters(customAttrValue);
                    xsw.writeEndElement();
                    xsw.writeEndElement();
                    break;
                // handle attributes of type enum
                case ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_STRING:
                case ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_INT:
                    !empty(attrValue) ? writeDynamicMultipleValueAttributes(xsw, attributeDef, sfccId, attrValue) : '';
                    break;
                // handle attributes of type set
                case ObjectAttributeDefinition.VALUE_TYPE_SET_OF_INT:
                case ObjectAttributeDefinition.VALUE_TYPE_SET_OF_NUMBER:
                    !empty(attrValue) ? writeDynamicMultipleValueSetAttributes(xsw, attributeDef, sfccId, attrValue) : '';
                    break;
                default:
                    xsw.writeStartElement('values');

                    xsw.writeStartElement('value');
                    xsw.writeCharacters(attrValue);
                    xsw.writeEndElement();

                    xsw.writeEndElement();
                }
                xsw.writeEndElement();
            }
        }
    }
}

/**
 * Function to add facet attribute in the dynamic attributes object
 * @param {Object} refinementAttrArray - object
 * @returns {void}
 */
function addIsFacetAttrsToPreference(refinementAttrArray) {
    optionalProductAttributes = Site.current.getCustomPreferenceValue('klevuOptionalProductAttributes');
    dynamicProductAttributes = Site.current.getCustomPreferenceValue('klevuDynamicProductAttributes');

    if (empty(optionalProductAttributes)) {
        Logger.error("'Product Attributes Mapping Optional' is missing from site preferences");
        throw new Error("'Product Attributes Mapping Optional' is missing from site preferences");
    }

    if (empty(dynamicProductAttributes)) {
        Logger.error("'Product Attributes Mapping Dynamic' is missing from site preferences");
        throw new Error("'Product Attributes Mapping Dynamic' is missing from site preferences");
    }

    optionalProductAttributes = JSON.parse(optionalProductAttributes);
    dynamicProductAttributes = JSON.parse(dynamicProductAttributes);

    if (refinementAttrArray && refinementAttrArray.length > 0) {
        for (var i = 0; i < dynamicProductAttributes.length; i++) {
            for (var j = 0; j < refinementAttrArray.length; j++) {
                if (dynamicProductAttributes[i].sfcc_id === refinementAttrArray[j]) {
                    dynamicProductAttributes[i].is_facet = true;
                    break;
                }
            }
        }
    }
    processedFacetAlready = true;
}

/**
 * Function to if atleast one additional currency record exists for the product
 * @param {List} sitePricebooks - all pricebooks list
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @returns {boolean} atleastOnePriceBookRecordExists
 */
function checkIfAtleastOneAdditionalCurrencyExists(sitePricebooks, product) {
    var defaultCurrency = Site.current.getDefaultCurrency();
    var allowedCurrencies = Site.getCurrent().getAllowedCurrencies();
    var atleastOnePriceBookRecordExists = false;
    priceBookHelpers.setApplicablePriceBooks(sitePricebooks.toArray());

    for (let i = 0; i < sitePricebooks.length; i++) {
        let priceBook = sitePricebooks[i];
        let priceBookCurrencyCode = priceBookHelpers.getCurrencyCode(priceBook);

        if (priceBookCurrencyCode !== defaultCurrency && priceBook.online) {
            let localeCurrency = currencyHelpers.getCurrency(priceBookCurrencyCode);

            if (allowedCurrencies.indexOf(priceBookCurrencyCode) !== -1) {
                session.setCurrency(localeCurrency);
            }

            let price = getProductPrice(product, priceBook, priceBookCurrencyCode);
            let salePrice = getProductSalePrice(product, priceBookCurrencyCode);

            var priceValue = price ? price.split(/[ ,]+/) : 0.0;
            var salesValue = salePrice ? salePrice.split(/[ ,]+/) : 0.0;

            if (priceValue[0] > 0 || salesValue[0] > 0) {
                atleastOnePriceBookRecordExists = true;
                break;
            }
        }
    }
    return atleastOnePriceBookRecordExists;
}

/**
 * Function to write additional currencies
 * @param {List} sitePricebooks - all pricebooks list
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @param {dw.io.XMLStreamWriter} xsw - xml file
 * @returns {void}
 */
function additionalCurrencies(sitePricebooks, product, xsw) {
    var defaultCurrency = Site.current.getDefaultCurrency();
    var allowedCurrencies = Site.getCurrent().getAllowedCurrencies();
    var alreadyAddedPrice = [];
    var alreadyAddedSalePrice = [];
    priceBookHelpers.setApplicablePriceBooks(sitePricebooks.toArray());

    for (let i = 0; i < sitePricebooks.length; i++) {
        let priceBook = sitePricebooks[i];
        let priceBookCurrencyCode = priceBookHelpers.getCurrencyCode(priceBook);

        if (priceBookCurrencyCode !== defaultCurrency && priceBook.online) {
            let localeCurrency = currencyHelpers.getCurrency(priceBookCurrencyCode);

            if (allowedCurrencies.indexOf(priceBookCurrencyCode) !== -1) {
                session.setCurrency(localeCurrency);
            }

            let price = getProductPrice(product, priceBook, priceBookCurrencyCode);
            let salePrice = getProductSalePrice(product, priceBookCurrencyCode);

            if (price && alreadyAddedPrice.indexOf(price) === -1) {
                xsw.writeStartElement('additional_currency');
                alreadyAddedPrice.push(price);

                xsw.writeStartElement('price');
                xsw.writeCharacters(price);
                xsw.writeEndElement();

                if (salePrice && price && salePrice === price) {
                    salePrice = null;
                }

                if (salePrice && alreadyAddedSalePrice.indexOf(salePrice) === -1) {
                    alreadyAddedSalePrice.push(salePrice);
                    xsw.writeStartElement('sale_price');
                    xsw.writeCharacters(salePrice);
                    xsw.writeEndElement();
                }
                xsw.writeEndElement();
            }
        }
    }
}

/**
 * Function to check and delete empty file
 * @param {dw.io.File} file - object
 * @returns {void}
 */
function checkEmptyFile(file) {
    var fr = new FileReader(file, 'UTF-8');
    var xsr = new XMLStreamReader(fr);
    var isItemElementPresent = false;

    while (xsr.hasNext()) {
        if (xsr.next() === XMLStreamConstants.START_ELEMENT) {
            var localElementName = xsr.getLocalName();

            if (localElementName === 'item') {
                isItemElementPresent = true;
                break;
            }
        }
    }

    if (!isItemElementPresent) {
        file.remove();
    }
}

/**
 * Function to get the availability status of product
 * @param {dw.catalog.ProductAvailabilityModel} availabilityModel - object
 * @returns {string} availability status
 */
function getAvailabilityStatus(availabilityModel) {
    var availability = availabilityModel ? availabilityModel.availabilityStatus : '';

    switch (availability) {
    case 'IN_STOCK':
    case 'PREORDER':
    case 'BACKORDER':
        availability = config.inStock;
        break;
    case 'NOT_AVAILABLE':
        availability = config.outOfStock;
        break;
    default:
        break;
    }

    return availability;
}

/**
 * Function to set back the session currency
 * @param {dw.util.Currency} defaultCurrency - default currency of current site
 * @returns {void}
 */
function setBackSessionCurrency(defaultCurrency) {
    var currencyCode = Currency.getCurrency(defaultCurrency);
    var allowedCurrencies = Site.getCurrent().getAllowedCurrencies();

    if (currencyCode && allowedCurrencies.indexOf(currencyCode.currencyCode) !== -1) {
        session.setCurrency(currencyCode);
    }
    var sitePricebooks = priceBookHelpers.getSitePriceBooks();
    if (!empty(sitePricebooks)) {
        priceBookHelpers.setApplicablePriceBooks(sitePricebooks.toArray());
    }
}

/**
 * Utility class for products
 */
let productUtils = {
     /**
     * Function to get mandatory fields
     * @param {dw.catalog.Product|dw.catalog.Variant} product - object
     * @param {boolean} isFullExport - determines id full export or delta export
     * @param {boolean=} [executePriceExportInFullExport] executePriceExportInFullExport - determines price export in fullexport
     * @returns {Object} values of mandatory attributes
     */
    getMandatoryFields: function (product, isFullExport, executePriceExportInFullExport) {
        var returnValue = null;

        if (executePriceExportInFullExport !== undefined) {
            priceDataInDeltaExport = executePriceExportInFullExport;
        }

        if (!isFullExport && priceDataInDeltaExport === false) {
            let customCache = require('~/cartridge/scripts/utils/customCacheWebdav');
            let SEP = File.SEPARATOR;
            let endPoint = Site.getCurrent().getID() ? Site.getCurrent().getID() + SEP + objectTypeName : objectTypeName;
            var productDataUpdated = false;

            productDataUpdated = checkIfProductDataUpdated(product, customCache.getCacheTime(endPoint));

            if (productDataUpdated) {
                returnValue = this.calculatePayLoad(product);
            }
        } else {
            returnValue = this.calculatePayLoad(product);
        }

        return returnValue;
    },

    /**
     * Function to calculate the payload
     * @param {dw.catalog.Product|dw.catalog.Variant} product - object
     * @returns {Object} calculated fields values
     */
    calculatePayLoad: function (product) {
        try {
            var sitePricebooks = priceBookHelpers.getSitePriceBooks();

            var variationModel = product ? getVariationModel(product) : '';
            var master = variationModel.getMaster();
            var masterID = master ? master.ID : '';

            var itemType = config.klevuProduct;
            var prdSku = product.ID || '';
            var link = require('dw/web/URLUtils').https(config.productShow, config.pid, masterID || prdSku);

            var avm = product ? product.getAvailabilityModel() : '';
            var availability = getAvailabilityStatus(avm);
            var categories = master ? master.getOnlineCategories() : product.getOnlineCategories();

            var price = getProductPrice(product, null, Site.current.getDefaultCurrency());
            var salePrice = getProductSalePrice(product, Site.current.getDefaultCurrency());

            if (salePrice && price && salePrice === price) {
                salePrice = null;
            }

            var largeTypeimages = product.getImages('large');
            var imageLink;
            var additionalImageLink;

            for (let i = 0; i < largeTypeimages.length; i++) {
                if (i === 0) {
                    imageLink = largeTypeimages[i] ? largeTypeimages[i].getHttpsURL().toString() : '';
                } else if (i === 1) {
                    additionalImageLink = largeTypeimages[i] ? largeTypeimages[i].getHttpsURL().toString() : '';
                    break;
                }
            }

            return {
                item_group_id: product.isVariant ? masterID : '',
                product: product,
                item_type: itemType,
                sku: prdSku,
                link: link,
                availability: availability,
                categories: categories,
                price: price,
                sale_price: salePrice,
                sitePricebooks: sitePricebooks,
                image_link: imageLink,
                additional_image_link: additionalImageLink
            };
        } catch (exception) {
            Logger.error('ERROR :calculating payload of a product ' + product.ID);
        }
    },

    /**
     * Function that writes data to variation products xml file for special characters
     * @param {Collection} lines - Actual payload for 3rd party system
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {Object} csvWriter - csv writer
     * @param {Object} refinementAttrArray - attribute search refinement IDs
     * @returns {void}
     */
    writeVariationData: function (lines, xsw, csvWriter, refinementAttrArray) {
        if (!processedFacetAlready) {
            addIsFacetAttrsToPreference(refinementAttrArray);
        }
        var allFields = getMandatoryProductAttributes();
        var requiredFields = allFields.requiredFields;
        var productDefinition = SystemObjectMgr.describe('Product');
        var requiredSytemFields = allFields.requiredSytemFields;
        var requiredCustomFields = allFields.requiredCustomFields;
        var systemField = [];
        var customField = [];
        var field = [];
        var systemAttrValue;
        var customAttrValue;
        var attributeDef;

        for (let i = 0; i < lines.length; i++) {
            let line;
            try {
                line = lines[i];
                let j;
                if (line) {
                    csvWriter.writeLine(line.product.ID);
                    Logger.info(line.product.ID);
                    xsw.writeStartElement('item');

                    for (j = 0; j < requiredSytemFields.length; j++) {
                        systemField = requiredSytemFields[j].split('-');

                        if (systemField[0] && systemField[1] && Object.prototype.hasOwnProperty.call((line.product), systemField[1])) {
                            xsw.writeStartElement(systemField[0]);
                            attributeDef = productDefinition ? productDefinition.getSystemAttributeDefinition(systemField[1]) : null;

                            // check for attribute of type Date+Time and format it
                            if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_DATETIME) {
                                systemAttrValue = StringUtils.formatCalendar(new Calendar(line.product[systemField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                            } else {
                                systemAttrValue = line.product[systemField[1]];
                            }
                            writeAttributeValue(attributeDef, systemAttrValue, xsw);
                            xsw.writeEndElement();
                        }
                    }

                    for (j = 0; j < requiredFields.length; j++) {
                        field = requiredFields[j];

                        if (!empty(line[field])) {
                            xsw.writeStartElement(field);

                            if (field === 'categories') {
                                writeCategories(line.categories, xsw);
                            } else {
                                xsw.writeCharacters(line[field]);
                            }

                            xsw.writeEndElement();
                        }
                    }

                    for (j = 0; j < requiredCustomFields.length; j++) {
                        customField = requiredCustomFields[j].split('-');

                        if (customField[0] && customField[1] && line.product.custom[customField[1]]) {
                            attributeDef = productDefinition ? productDefinition.getCustomAttributeDefinition(customField[1]) : null;

                            // check for attribute of type Date+Time and format it
                            if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_DATETIME) {
                                customAttrValue = StringUtils.formatCalendar(new Calendar(line.product.custom[customField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                            } else {
                                customAttrValue = line.product.custom[customField[1]];
                            }
                            xsw.writeStartElement(customField[0]);
                            writeAttributeValue(attributeDef, customAttrValue, xsw);
                            xsw.writeEndElement();
                        }
                    }

                    var sitePricebooks = line.sitePricebooks;
                    var atleastOnePriceBookRecordExists = false;
                    var defaultCurrency = Site.current.getDefaultCurrency();

                    if (sitePricebooks && sitePricebooks.length) {
                        atleastOnePriceBookRecordExists = checkIfAtleastOneAdditionalCurrencyExists(sitePricebooks, line.product);
                        if (atleastOnePriceBookRecordExists) {
                            xsw.writeStartElement('additional_currencies');
                            additionalCurrencies(sitePricebooks, line.product, xsw);
                            xsw.writeEndElement();
                        }
                         // set back session and pricebook of current site
                        setBackSessionCurrency(defaultCurrency);
                    }

                    var optionalAttrPresent = optionalProductAttributes.some(function (optionalAttr) {
                        return optionalAttr.sfcc_id in line.product.custom || optionalAttr.sfcc_id in line.product;
                    });

                    var dynamicAttrPresent = dynamicProductAttributes.some(function (dynamicAttr) {
                        return dynamicAttr.sfcc_id in line.product.custom;
                    });

                    if (optionalAttrPresent) {
                        writeOptionalAttributes(optionalProductAttributes, line.product, xsw, productDefinition);
                    }

                    if (dynamicAttrPresent) {
                        xsw.writeStartElement('attributes');
                        writeDynamicAttributes(dynamicProductAttributes, line.product, xsw);
                        xsw.writeEndElement();
                    }
                    xsw.writeEndElement();
                }
            } catch (exception) {
                if (line && line.product.ID) {
                    Logger.info('Failed product ID ' + line.product.ID);
                    Logger.error('Exception while writing variation product data ' + exception.stack + ' with Error: ' + exception.message);
                }
            }
        }
    },

    /**
     * Function that writes data to simple products xml file for special characters
     * @param {Collection} lines - Actual payload for 3rd party system
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {Object} csvWriter - csv writer
     * @param {Object} refinementAttrArray - attribute search refinement IDs
     * @param {string | boolean} isFullExport - determines id full export or delta export
     * @returns {Object}
     */
    writeData: function (lines, xsw, csvWriter, refinementAttrArray, isFullExport) {
        if (!processedFacetAlready) {
            addIsFacetAttrsToPreference(refinementAttrArray);
        }
        var allFields = getMandatoryProductAttributes();
        var requiredFields = allFields.requiredFields;
        var productDefinition = SystemObjectMgr.describe('Product');
        var requiredSytemFields = allFields.requiredSytemFields;
        var requiredCustomFields = allFields.requiredCustomFields;
        var systemField = [];
        var customField = [];
        var field = [];
        var systemAttrValue;
        var customAttrValue;
        var attributeDef;
        var fileClosed = false;

        var productsInSingleFile = Site.current.getCustomPreferenceValue('klevuProductsInSingleFile');
        productsInSingleFile = productsInSingleFile < 100 ? 100 : productsInSingleFile;

        for (let i = 0; i < lines.length; i++) {
            let line;
            try {
                if (counter === 0) {
                    xsw = this.createXml(filesCounter++, isFullExport, config.productObject);
                    fileClosed = false;
                }

                line = lines[i];
                let j;
                if (line) {
                    csvWriter.writeLine(line.product.ID);
                    Logger.info(line.product.ID);
                    xsw.writeStartElement('item');

                    for (j = 0; j < requiredSytemFields.length; j++) {
                        systemField = requiredSytemFields[j].split('-');

                        if (systemField[0] && systemField[1] && line.product[systemField[1]]) {
                            xsw.writeStartElement(systemField[0]);
                            attributeDef = productDefinition ? productDefinition.getSystemAttributeDefinition(systemField[1]) : null;

                            // check for attribute of type Date+Time and format it
                            if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_DATETIME) {
                                systemAttrValue = StringUtils.formatCalendar(new Calendar(line.product[systemField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                            } else {
                                systemAttrValue = line.product[systemField[1]];
                            }
                            writeAttributeValue(attributeDef, systemAttrValue, xsw);
                            xsw.writeEndElement();
                        }
                    }

                    for (j = 0; j < requiredFields.length; j++) {
                        field = requiredFields[j];

                        if (!empty(line[field])) {
                            xsw.writeStartElement(field);

                            if (field === 'categories') {
                                writeCategories(line.categories, xsw);
                            } else {
                                xsw.writeCharacters(line[field]);
                            }

                            xsw.writeEndElement();
                        }
                    }

                    for (j = 0; j < requiredCustomFields.length; j++) {
                        customField = requiredCustomFields[j].split('-');

                        if (customField[0] && customField[1] && Object.prototype.hasOwnProperty.call((line.product.custom), customField[1])) {
                            attributeDef = productDefinition ? productDefinition.getCustomAttributeDefinition(customField[1]) : null;

                            // check for attribute of type Date+Time and format it
                            if (attributeDef && attributeDef.valueTypeCode === ObjectAttributeDefinition.VALUE_TYPE_DATETIME) {
                                customAttrValue = StringUtils.formatCalendar(new Calendar(line.product.custom[customField[1]]), 'YYYY-MM-dd\'T\'HH:mm:ss.SSSZ');
                            } else {
                                customAttrValue = line.product.custom[customField[1]];
                            }
                            xsw.writeStartElement(customField[0]);
                            writeAttributeValue(attributeDef, customAttrValue, xsw);
                            xsw.writeEndElement();
                        }
                    }

                    var sitePricebooks = line.sitePricebooks;
                    var atleastOnePriceBookRecordExists = false;
                    var defaultCurrency = Site.current.getDefaultCurrency();

                    if (sitePricebooks && sitePricebooks.length) {
                        atleastOnePriceBookRecordExists = checkIfAtleastOneAdditionalCurrencyExists(sitePricebooks, line.product);
                        if (atleastOnePriceBookRecordExists) {
                            xsw.writeStartElement('additional_currencies');
                            additionalCurrencies(sitePricebooks, line.product, xsw);
                            xsw.writeEndElement();
                        }
                        // set back session and pricebook of current site
                        setBackSessionCurrency(defaultCurrency);
                    }

                    var optionalAttrPresent = optionalProductAttributes.some(function (optionalAttr) {
                        return optionalAttr.sfcc_id in line.product.custom || optionalAttr.sfcc_id in line.product;
                    });

                    var dynamicAttrPresent = dynamicProductAttributes.some(function (dynamicAttr) {
                        return dynamicAttr.sfcc_id in line.product.custom;
                    });

                    if (optionalAttrPresent) {
                        writeOptionalAttributes(optionalProductAttributes, line.product, xsw, productDefinition);
                    }

                    if (dynamicAttrPresent) {
                        xsw.writeStartElement('attributes');
                        writeDynamicAttributes(dynamicProductAttributes, line.product, xsw);
                        xsw.writeEndElement();
                    }
                    xsw.writeEndElement();
                }
                counter++;
                if (counter === productsInSingleFile) {
                    this.closeXml(xsw, isFullExport);
                    counter = 0;
                    fileClosed = true;
                }
                simpleProductsWrittenSuccessfully++;
            } catch (exception) {
                if (line && line.product.ID) {
                    Logger.info('Failed product ID ' + line.product.ID);
                    Logger.error('Exception while writing simple product data ' + exception.stack + ' with Error: ' + exception.message);
                    counter++;
                }
            }
        }
        return {
            fileClosed: fileClosed,
            xsw: xsw,
            simpleProductsCount: simpleProductsWrittenSuccessfully
        };
    },

    /**
     * Function that writes data to xml file for variants of master products
     * @param {Collection} lines - Actual payload for 3rd party system
     * @param {Object} refinementAttrArray - attribute search refinement IDs
     * @param {boolean} isFullExport - determines id full export or delta export
     * @param {boolean} executePriceExportInFullExport - determines price export in fullexport
     * @returns {void}
     */
    writeMasterData: function (lines, refinementAttrArray, isFullExport, executePriceExportInFullExport) {
        var isRecordsWrittenToXml = false;
        addIsFacetAttrsToPreference(refinementAttrArray);
        const csvWriter = new CsvWriter(config.sentProductsHeader);
        csvWriter.initializeCSVStreamWriter(
            StringUtils.format(config.baseKlevuPath + config.sentProductsPath, Site.getCurrent().ID),
            StringUtils.format(config.sentProductsFileName, StringUtils.formatCalendar(new Calendar(), 'yyyyMMddHHmmssSSS'))
        );
        var productsInSingleFile = Site.current.getCustomPreferenceValue('klevuProductsInSingleFile');
        productsInSingleFile = productsInSingleFile < 100 ? 100 : productsInSingleFile;

        var count = 0;
        var start = 0;
        var xsw;
        var totalMasterProducts = lines.length;
        var numberOfFiles = parseInt((totalMasterProducts / productsInSingleFile), 10);
        var remainingProducts = totalMasterProducts % productsInSingleFile;

        if (numberOfFiles < 1) {
            productsInSingleFile = remainingProducts;
        }

        var end = productsInSingleFile;

        if (remainingProducts > 0) {
            numberOfFiles++;
        }

        for (var ind = 0; ind < numberOfFiles; ind++) {
            xsw = this.createXml(ind, isFullExport, config.productObject);
            var i;
            for (i = start; i < end; i++) {
                var variant = null;
                var payload = [];
                var masterPrd = lines[i];
                var variants = masterPrd.getVariants().toArray();

                var isMasterProductWritten = false;
                for (var j = 0; j < variants.length; j++) {
                    variant = variants[j];
                    payload[j] = this.getMandatoryFields(variant, isFullExport, executePriceExportInFullExport);
                    if (payload[j]) {
                        isMasterProductWritten = true;
                    }
                }
                if (isMasterProductWritten) {
                    ++count;
                }

                if (!empty(payload)) {
                    this.writeVariationData(payload, xsw, csvWriter);
                }
            }

            this.closeXml(xsw, isFullExport);

            start = i;
            end = productsInSingleFile + end;
            end = end > totalMasterProducts ? totalMasterProducts : end;
        }

        if (count !== 0) {
            isRecordsWrittenToXml = true;
            Logger.info('Master product count sent to write in xml : ' + count);
        }

        csvWriter.closeStream();

        return isRecordsWrittenToXml;
    },

    /**
     * Function that creates the xml file
     * @param {number} count - no. of files count
     * @param {boolean} isFullExport - full export or delta export
     * @param {string} objectType - object type
     * @returns {dw.io.XMLStreamWriter} xsw - xml file
     */
    createXml: function (count, isFullExport, objectType) {
        fileType = isFullExport ? config.productFullExport : config.productDeltaExport;
        var fileCount = count >= 0 ? (fileType + count + '-') : fileType;
        var folderPath = klevuUtils.getKlevuPath(config.fileUploadPath);
        var fileName = String.concat(config.filePrepend, fileCount, timeStamp, '.xml');
        var exportMode = isFullExport ? config.jobTypeFull : config.jobTypeDelta;
        fullFileName = folderPath + File.SEPARATOR + fileName;

        if (fileNamesList.indexOf(fileName) === -1) {
            klevuJobUtils.pushDataFileName(fileName, exportMode, objectType);
            fileNamesList.push(fileName);
        }
        file = new File(fullFileName);
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
            xsw.writeStartElement('title');
            xsw.writeCharacters(Site.current.name || Site.current.ID);
            xsw.writeEndElement(); // title
            xsw.writeStartElement('link');
            xsw.writeCharacters(Site.current.httpsHostName);
            xsw.writeEndElement(); // link
        } catch (e) {
            throw new Error('ERROR : While writing XML product required attributes file : ' + e.stack + ' with Error: ' + e.message);
        }

        return xsw;
    },

    /**
     * Function that closes the xml file
     * @param {dw.io.XMLStreamWriter} xsw - xml file
     * @param {boolean} isFullExport - full export or delta export
     * @returns {void}
     */
    closeXml: function (xsw, isFullExport) {
        try {
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

            if (!isFullExport) {
                checkEmptyFile(file);
            }

            if (file.file) {
                klevuUtils.compressFile(fullFileName);
            }
        } catch (exception) {
            Logger.error('ERROR : closing and compressing the product xml file ' + exception.stack + ' with Error: ' + exception.message);
        }
    }
};

module.exports = productUtils;
