'use strict';

/* API Includes */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/* Script Includes*/
const LogUtils = require('~/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuHttpServiceInit');

var klevuHttpServiceInit = {};

klevuHttpServiceInit.serviceCall = function (method, endPoint, requestBody, serviceName, SFTPAuthToken, SFTPApiKey, isSFTPService, klevuNotifyURL, isNotifyService) {
    var result;
    var serviceResponse;
    try {
        var httpService = LocalServiceRegistry.createService(serviceName, {
            createRequest: function (service, args) {
                service.setRequestMethod(args.method);
                service.addHeader('Content-Type', 'application/json');

                if (args.isSFTPService) {
                    var serviceURL = service.configuration.credential.URL;
                    /* Configured URL is in format: https://base_url/{api_key}/some_path */
                    var URLWithApiKey = serviceURL.replace('{api_key}', args.SFTPApiKey);
                    service.setURL(URLWithApiKey);
                    service.addHeader('Authorization', 'Bearer ' + args.SFTPAuthToken);
                } else if (args.isNotifyService) {
                    service.setURL(args.klevuNotifyURL);
                    service.addHeader('Authorization', 'Bearer ' + args.SFTPAuthToken);
                } else { /* Storefront Search Service */
                    service.setURL(args.endPointUrl);
                }
                Logger.info('Request created successfully in CreateRequest method of klevuHttpServiceInit');
                return args.request;
            },
            parseResponse: function (service, httpClient) {
                var parseResponse;

                if (httpClient.statusCode === 200 || httpClient.statusCode === 201) {
                    parseResponse = httpClient.getText();
                    Logger.debug('Http response: ' + httpClient.statusCode);
                } else {
                    Logger.error('Error on http request: ' + httpClient.getErrorText());
                    parseResponse = null;
                }
                Logger.info('Parsed response  in parseResponse method of klevuHttpServiceInit');
                return parseResponse;
            },
            getRequestLogMessage: function (request) {
                return request;
            },
            getResponseLogMessage: function (response) {
                return response.text;
            }
        });

        result = httpService.call({
            method: method,
            endPointUrl: endPoint,
            request: requestBody || '',
            isSFTPService: isSFTPService,
            SFTPAuthToken: SFTPAuthToken,
            SFTPApiKey: SFTPApiKey,
            klevuNotifyURL: klevuNotifyURL,
            isNotifyService: isNotifyService
        });
    } catch (exception) {
        Logger.error('Error on service execution: ' + result.errorMessage);
        throw new Error('ERROR : in service execution : ' + exception.stack + ' with Error: ' + exception.message);
    }
    Logger.info('Service result status in klevuHttpServiceInit ' + result.status);
    if (result.status === 'OK') {
        serviceResponse = result.object;
    } else {
        serviceResponse = result.errorMessage;
        Logger.error('Service result status is not OK. Check the logs ' + result.errorMessage);
    }
    return serviceResponse;
};

module.exports = klevuHttpServiceInit;
