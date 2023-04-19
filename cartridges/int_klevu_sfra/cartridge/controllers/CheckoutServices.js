'use strict';

/* global empty, session */

/**
 * @namespace CheckoutServices
 */

var server = require('server');
server.extend(module.superModule);

/* API Includes*/
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');

/* Script Includes*/
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
var priceBookHelpers = require('*/cartridge/scripts/helpers/klevuPriceBookHelpers');
var klevuUtilsCore = require('*/cartridge/scripts/utils/klevuUtilsCore');

/**
 * CheckoutServices-PlaceOrder : The CheckoutServices-PlaceOrder endpoint places the order
 * @name Base/CheckoutServices-PlaceOrder
 * @function
 * @memberof CheckoutServices
 * @param {middleware} - server.middleware.https
 * @param {category} - sensitive
 * @param {returns} - json
 * @param {serverfunction} - post
 */
server.append('PlaceOrder', server.middleware.https, function (req, res, next) {
    if (klevuUtils.config.enableKlevuStorefront) {
        var productPricesArray = [];
        var productLineItemPriceResp;
        var isBaseCurrencyDifferent = false;
        var orderCurrency;
        var checkoutData = res.getViewData();
        var order = OrderMgr.getOrder(checkoutData.orderID, checkoutData.orderToken);

        if (order) {
            for (var i = 0; i < order.allProductLineItems.length; i++) {
                var pli = order.allProductLineItems[i];
                if (pli.product) {
                    orderCurrency = pli.basePrice.currencyCode;
                    isBaseCurrencyDifferent = klevuUtilsCore.baseCurrencyCheck(orderCurrency);

                    if (isBaseCurrencyDifferent) {
                        productLineItemPriceResp = klevuUtilsCore.getBaseCurrencyPrice(pli.product);
                        productPricesArray.push(productLineItemPriceResp);
                    }
                }
            }

            if (isBaseCurrencyDifferent) {
                Transaction.begin();
                order.custom.klevuProductBaseCurrency = JSON.stringify(productPricesArray);
                Transaction.commit();
            }
        }

        // set back session and pricebook of current site
        var Currency = require('dw/util/Currency');
        var currencyCode = Currency.getCurrency(orderCurrency);
        var allowedCurrencies = Site.getCurrent().getAllowedCurrencies();

        if (currencyCode && allowedCurrencies.indexOf(currencyCode.currencyCode) !== -1) {
            session.setCurrency(currencyCode);
        }
        var sitePricebooks = priceBookHelpers.getSitePriceBooks();
        if (!empty(sitePricebooks)) {
            priceBookHelpers.setApplicablePriceBooks(sitePricebooks.toArray());
        }
    }

    return next();
});

module.exports = server.exports();