'use strict';

/* eslint-disable no-param-reassign */

/**
 * Search order for the Order Feed Export
 */

/* API Includes*/
const Order = require('dw/order/Order');
const OrderMgr = require('dw/order/OrderMgr');
const Site = require('dw/system/Site');
const File = require('dw/io/File');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuOrderSearch');

/**
 * getLastOrderSyncTime to get lastRunTime of the job execution
 * @returns {lastRunTime} return the last run time of the job.
 */
function getLastOrderSyncTime() {
    let customCache = require('~/cartridge/scripts/utils/customCacheWebdav');
    let SEP = File.SEPARATOR;
    let objectTypeName = 'order';
    let customCacheWrapper;
    try {
        let endPoint = Site.getCurrent().getID() ? Site.getCurrent().getID() + SEP + objectTypeName : objectTypeName;
        customCacheWrapper = customCache.getCacheTime(endPoint);

        if (customCacheWrapper) {
            return customCacheWrapper;
        }
    } catch (e) {
        Logger.error(e.toString());
    }

    return '';
}

/**
 * Object implements default searchModel interface
 * @param {Object} parameters - params for searchModel
 * @return {Object} public api methods
 */
let searchModel = function () {
    Logger.info('Starting order export data');
    let lastOrderSyncTime = getLastOrderSyncTime();
    let orderCount = 0;
    var allOrders = [];

    /**
     * Function that stores the orders
     * @param {dw.order.Order} order - object
     */
    function callback(order) {
        allOrders.push(order);
        orderCount++;
    }

    try {
        var query = 'exportStatus = {0}';
        var queryParams = [];
        queryParams.push(Order.EXPORT_STATUS_READY);

        if (lastOrderSyncTime) {
            query += ' AND creationDate >= {1}';
            queryParams.push(lastOrderSyncTime);
        }
        OrderMgr.processOrders(callback, query, queryParams);
    } catch (e) {
        Logger.error('Error occurred while searching for orders {0}', e.message);
        return false;
    }
    Logger.info('Found {0} orders', orderCount);
    return {
        getNext: function (counter) {
            var order = null;
            counter = (counter && counter >= 0) ? counter : 0;
            if (allOrders.length) {
                order = allOrders.pop();
            }
            counter++;

            var response = {
                order: order,
                count: counter
            };
            return order ? response : null;
        }
    };
};

module.exports = searchModel;
