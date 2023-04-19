'use strict';

var Site = require('dw/system/Site');

var server = require('server');

/**
 * Klevu-GetAPIKeys : This endpoint is hit from the content asset 'klevu-quick-search-js' to get API keys from Site Preference
 */
server.get('GetAPIKeys', function (req, res, next) {
    var returnValue = {
        apiKey: Site.getCurrent().getCustomPreferenceValue('klevuAPIKey') || ''
    };

    res.json(returnValue);
    next();
});

/**
 * Klevu-GetSearchURL : This endpoint is hit from the content asset 'klevu-quick-search-js' to get Search Base URL from Site Preference
 */
server.get('GetSearchURL', function (req, res, next) {
    const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');
    var returnValue = {
        searchURL: klevuUtils.config.searchEndPoint || ''
    };

    res.json(returnValue);
    next();
});

module.exports = server.exports();
