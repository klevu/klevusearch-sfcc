'use strict';

/* global empty */

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuOrderExport');
const orderUtils = require('~/cartridge/scripts/utils/orderUtils');

/* Global Variables*/
var exportModel;
var counter;
var validOrders = false;

/**
 * beforeStep. Creation of the file and initialization XML file
 */
function beforeStep() {
    var ExportModel = require('~/cartridge/scripts/models/order/klevuOrderExportModel');
    exportModel = new ExportModel();
}

/**
 * read. Read all the order
 * @returns {Array} Array of product objects
 */
function read() {
    var output = exportModel.getNextItem(counter);
    counter = (output && output.count) > 0 ? output.count : 0;
    var orderObject = !empty(output) ? output.order : null;
    return orderObject;
}

/**
 * process. Retrieve all the needed data for http service call
 * @param {Object} order - object
 * @returns {Array} Array of order fields
 */
function process(order) {
    return orderUtils.getOrderFields(order);
}

/**
 * write. Write the data in the file
 * @param {Collection} lineItems - Actual payload for third party system
 * @returns {void}
 */
function write(lineItems) {
    if (!empty(lineItems)) {
        Logger.info('orders count sent to klevu API : ' + lineItems.size());
        for (var i = 0; i < lineItems.size(); i++) {
            var productLineItems = lineItems.get(i);
            for (var j = 0; j < productLineItems.size(); j++) {
                orderUtils.sendOrderToKlevu(productLineItems.get(j));
                validOrders = true;
            }
        }
    }
}

/**
 * afterStep.
 * @param {boolean} success - order send to klevu is successful or not
 * @returns {void}
 */
function afterStep(success) {
    if (success && validOrders) {
        Logger.info('Orders send to klevu successfully');
    }
}

module.exports = {
    beforeStep: beforeStep,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
