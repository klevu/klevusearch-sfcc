'use strict';

/* global empty */
/* Script Includes*/
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
var klevuAnalyticsHttpServiceInit = require('*/cartridge/scripts/service/klevuAnalyticsHttpServiceInit');
var klevuUtilsCore = require('*/cartridge/scripts/utils/klevuUtilsCore');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('orderUtils');
var Site = require('dw/system/Site');

/**
 * Return type of the current product
 * @param  {dw.catalog.ProductVariationModel} product - Current product
 * @return {string} type of the current product
 */
function getProductType(product) {
    var result;
    if (product.master) {
        result = klevuUtils.config.productTypeMaster;
    } else if (product.variant) {
        result = klevuUtils.config.productTypeVariant;
    } else if (product.variationGroup) {
        result = klevuUtils.config.productTypeVariationGroup;
    } else if (product.productSet) {
        result = klevuUtils.config.productTypeSet;
    } else if (product.bundle) {
        result = klevuUtils.config.productTypeBundle;
    } else if (product.optionProduct) {
        result = klevuUtils.config.productTypeOptionProduct;
    } else {
        result = klevuUtils.config.productTypeStandard;
    }
    return result;
}

/**
 * Function to get the required order fields
 * @param {dw.order.Order} order - object
 * @return {Array} array of objects
 */
function getOrderFields(order) {
    var productLineItemArray = [];
    var productType;
    var atleastOneProductLineItemExists = false;

    for (var i = 0; i < order.productLineItems.length; i++) {
        var pli = order.productLineItems[i];

        if (!empty(pli.product)) {
            productType = getProductType(pli.product);

            if (productType === klevuUtils.config.productTypeVariant
               || productType === klevuUtils.config.productTypeStandard
               || productType === klevuUtils.config.productTypeOptionProduct
               || productType === klevuUtils.config.productTypeBundle) {
                var salePrice = '';
                var currency = '';
                var productPricesArray;
                var orderCurrency = pli.basePrice.currencyCode;
                var isBaseCurrencyDifferent = klevuUtilsCore.baseCurrencyCheck(orderCurrency);

                if (isBaseCurrencyDifferent) {
                    var savedPriceResponse = order.custom.klevuProductBaseCurrency;

                    if (!empty(savedPriceResponse)) {
                        productPricesArray = JSON.parse(savedPriceResponse);

                        for (var j = 0; j < productPricesArray.length; j++) {
                            var salesPriceResp = productPricesArray[j];

                            if (salesPriceResp.productID === pli.productID) {
                                salePrice = salesPriceResp.price;
                                currency = salesPriceResp.currCode;
                                break;
                            }
                        }
                    } else {
                        var baseCurrencyPrice = klevuUtilsCore.getBaseCurrencyPrice(pli.product);
                        salePrice = baseCurrencyPrice.price;
                        currency = baseCurrencyPrice.currCode;
                    }
                } else {
                    salePrice = pli.basePrice.decimalValue;
                    currency = orderCurrency;
                }

                // Prepend master id to a variation id if custom preference is enabled . 
                var itemGroupIdToItemId = Site.current.getCustomPreferenceValue('klevuItemGroupIdToItemId') || false;
                var productId = (itemGroupIdToItemId && itemGroupIdToItemId.value === "true" && productType === klevuUtils.config.productTypeVariant && pli.product.masterProduct) ? pli.product.masterProduct.ID + '-' + pli.productID : pli.productID;
                
                // Add new fields to the Order Export Job
                var productGroupId, productVariantId;
                if (productType === klevuUtils.config.productTypeVariant && pli.product.masterProduct) {
                    productGroupId = pli.product.masterProduct.ID;
                    productVariantId = pli.productID;
                } else {
                    productGroupId = (productVariantId = pli.productID);
                }

                productLineItemArray.push({
                    orderNo: order.orderNo,
                    itemType: 'checkout',
                    productId: productId,
                    productGroupId: productGroupId,
                    productVariantId: productVariantId,
                    unit: pli.quantity.value,
                    salePrice: salePrice,
                    currency: currency,
                    shopperIP: order.remoteHost || ''
                });
                atleastOneProductLineItemExists = true;
            }
        }
    }
    return atleastOneProductLineItemExists === true ? productLineItemArray : null;
}

/**
 * Function to send the orders to klevu
 * @param {Object} attribute - object
 * @return {void}
 */
function sendOrderToKlevu(attribute) {
    var apiKey = klevuUtils.getCustomPrefConfig().apiKey;
    var restKey = klevuUtils.getCustomPrefConfig().restKey;
    var serviceName = klevuUtils.config.analyticsHttpServiceName;
    var method = klevuUtils.config.serviceMethod;
    var parametes = 'klevu_apiKey=' + apiKey
    + '&klevu_type=' + attribute.itemType
    + '&klevu_productId=' + attribute.productId
    + '&klevu_productGroupId=' + attribute.productGroupId
    + '&klevu_productVariantId=' + attribute.productVariantId
    + '&klevu_unit=' + attribute.unit
    + '&klevu_salePrice=' + attribute.salePrice
    + '&klevu_shopperIP=' + attribute.shopperIP
    + '&klevu_currency=' + attribute.currency;
    Logger.info('Order ID: ' + attribute.orderNo);
    Logger.info('API request POST parameters:\n' + parametes.replace(/&/g, '\n'));

    // Encoding the URL to be passed on to Klevu Service : product ids can cotain space 
    var endpoint = encodeURI('productTracking?' + parametes);
    var response = klevuAnalyticsHttpServiceInit.serviceCall(method, endpoint, serviceName, restKey);

    if (response && response.status !== 'OK') {
        throw new Error('Error while connecting klevu analytics Http service call');
    }
}

module.exports = {
    getOrderFields: getOrderFields,
    sendOrderToKlevu: sendOrderToKlevu
};