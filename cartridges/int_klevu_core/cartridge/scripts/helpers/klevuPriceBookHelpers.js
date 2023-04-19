'use strict';

/* API Includes*/
const PriceBookMgr = require('dw/catalog/PriceBookMgr');

/**
 * Helper class for pricebooks
 */
let priceBookHelpers = {
    /**
     * Function to retrieve all pricebooks of current site
     * @return {List} Site's pricebooks
     */
    getSitePriceBooks: function () {
        return PriceBookMgr.getSitePriceBooks();
    },

    /**
     * Function to set the applicable pricebooks in the session
     * @param {Array} applicablePrcBooks - array of pricebooks
     * @return {void}
     */
    setApplicablePriceBooks: function (applicablePrcBooks) {
        PriceBookMgr.setApplicablePriceBooks(applicablePrcBooks);
    },

    /**
     * Function to retrieve currency code of the price book
     * @param {Object} priceBook - object
     * @return {string} currency code
     */
    getCurrencyCode: function (priceBook) {
        return priceBook.getCurrencyCode();
    }
};

module.exports = priceBookHelpers;
