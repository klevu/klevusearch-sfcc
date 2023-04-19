'use strict';

/* API Includes*/
const Currency = require('dw/util/Currency');

/**
 * Helper class for currency
 */
let currencyHelpers = {
    /**
     * Function to retrieve currency object
     * @param {string} currency - currency code
     * @return {Object} currency object
     */
    getCurrency: function (currency) {
        return Currency.getCurrency(currency);
    }
};

module.exports = currencyHelpers;
