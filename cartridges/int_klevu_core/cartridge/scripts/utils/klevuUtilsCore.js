/* global session */

'use strict';

/* API Includes*/
const Site = require('dw/system/Site');

/* Script Includes*/
var priceBookHelpers = require('~/cartridge/scripts/helpers/klevuPriceBookHelpers');
var currencyHelpers = require('~/cartridge/scripts/helpers/klevuCurrencyHelpers');
var productHelpers = require('~/cartridge/scripts/helpers/klevuProductHelpers');

/**
 * Function to check if currency is site's base currency
 * @param {string} orderCurrency - currency code of order
 * @return {boolean} true/false
 */
function baseCurrencyCheck(orderCurrency) {
    var defaultCurrency = Site.current.getDefaultCurrency();
    var allowedCurrencies = Site.getCurrent().getAllowedCurrencies();

    if (orderCurrency !== defaultCurrency) {
        var prcBook = null;
        var prcBookCurrency = '';
        var applicablePrcBooks = [];
        var applicableprcBookCurrency = '';
        var sitePricebooks = priceBookHelpers.getSitePriceBooks();

        for (var i = 0; i < sitePricebooks.length; i++) {
            prcBook = sitePricebooks[i];
            prcBookCurrency = priceBookHelpers.getCurrencyCode(prcBook);

            if (defaultCurrency === prcBookCurrency) {
                applicablePrcBooks.push(prcBook);
                applicableprcBookCurrency = prcBookCurrency;
            }
        }

        var localeCurrency = currencyHelpers.getCurrency(applicableprcBookCurrency);
        if (allowedCurrencies.indexOf(localeCurrency.currencyCode) !== -1) {
            session.setCurrency(localeCurrency);
        }
        priceBookHelpers.setApplicablePriceBooks(applicablePrcBooks);

        return true;
    }

    return false;
}

/**
 * Function to retrieve base currency price of product
 * @param {dw.catalog.Product|dw.catalog.Variant} product - object
 * @return {Object} price and currency code
 */
function getBaseCurrencyPrice(product) {
    let price = productHelpers.getPrice(product);
    let priceValue = price.valueOrNull;
    let currCode = price.currencyCode;

    return {
        productID: product.ID,
        price: priceValue,
        currCode: currCode
    };
}


module.exports = {
    baseCurrencyCheck: baseCurrencyCheck,
    getBaseCurrencyPrice: getBaseCurrencyPrice
};

