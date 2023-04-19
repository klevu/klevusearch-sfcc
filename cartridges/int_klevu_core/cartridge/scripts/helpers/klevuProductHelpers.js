/* global empty */

'use strict';

/**
 * Return root price book for a given price book
 * @param {dw.catalog.PriceBook} priceBook - Provided price book
 * @returns {dw.catalog.PriceBook} root price book
 */
function getRootPriceBook(priceBook) {
    var rootPriceBook = priceBook;
    while (rootPriceBook.parentPriceBook) {
        rootPriceBook = rootPriceBook.parentPriceBook;
    }
    return rootPriceBook;
}

/**
 * Helper class for products
 */
let productHelpers = {
    /**
     * Function to retrieve price object of product
     * @param {dw.catalog.Product|dw.catalog.Variant} product - object
     * @return {Object} price object
     */
    getPrice: function (product) {
        var priceModel = product.getPriceModel();
        let price = 0;

        if (!empty(priceModel)) {
            price = priceModel.getPrice();
        }

        return price;
    },

        /**
         * Function to retrieve list price of a  product
         * @param {dw.catalog.Product|dw.catalog.Variant} product - object
         * @param {List} listPriceBook - price book list
         * @return {List} listPriceBook
         */
    getListPrice: function (product, listPriceBook) {
        var priceModel = product.getPriceModel();
        var rootPriceBook;

        if (!empty(priceModel.priceInfo)) {
            rootPriceBook = getRootPriceBook(priceModel.priceInfo.priceBook);
        } else if (!empty(listPriceBook)) {
            rootPriceBook = getRootPriceBook(listPriceBook);
        }

        var priceBookPrice = !empty(rootPriceBook) ? priceModel.getPriceBookPrice(rootPriceBook.ID) : null;
        let listPrice = 0;

        if (!empty(priceBookPrice)) {
            listPrice = priceBookPrice;
        }

        return listPrice;
    }
};

module.exports = productHelpers;
