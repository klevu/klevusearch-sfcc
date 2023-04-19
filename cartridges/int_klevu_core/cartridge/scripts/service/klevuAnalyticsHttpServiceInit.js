'use strict';

/**
 * Service call for communication between SFCC cartridge and klevu REST API
 **/
/* API Includes*/
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/* Script Includes*/
const LogUtils = require('~/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuAnalyticsHttpServiceInit');

var klevuAnalyticsHttpServiceInit = {};

klevuAnalyticsHttpServiceInit.serviceCall = function (method, endPoint, serviceName, restKey) {
    var httpService = LocalServiceRegistry.createService(serviceName, {
        createRequest: function (service, args) {
            service.setRequestMethod(args.method);
            service.addHeader('Content-Type', 'application/xml');
            service.setURL(service.configuration.credential.URL + args.endPoint);
            service.addHeader('Authorization', 'Bearer ' + args.restKey);
        },
        parseResponse: function (service, httpClient) {
            var parseResponse;

            if (httpClient.statusCode === 200 || httpClient.statusCode === 201) {
                parseResponse = httpClient.getText();
                Logger.info('API response: ' + parseResponse);
            } else {
                Logger.error('Error on http request: ' + httpClient.getErrorText());
                parseResponse = null;
            }
            return parseResponse;
        },
        getRequestLogMessage: function (request) {
            return request;
        },
        getResponseLogMessage: function (response) {
            return response.text;
        }
    });

    var result = httpService.call({
        method: method,
        endPoint: endPoint,
        restKey: restKey
    });

    if (result.status !== 'OK') {
        Logger.error('Error on service execution: ' + result.errorMessage);
    }
    Logger.info('Service result status in klevuAnalyticsHttpServiceInit ' + result.status);
    return result;
};

module.exports = klevuAnalyticsHttpServiceInit;
