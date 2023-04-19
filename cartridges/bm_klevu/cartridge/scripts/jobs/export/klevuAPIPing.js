/**
 * To check the availability of Kleuv API
 * @returns {boolean}
 */

/* global empty */
/* eslint no-unreachable: 0 */
/* eslint no-else-return: 0 */

const Status = require('dw/system/Status');
const klevuHttpServiceInit = require('*/cartridge/scripts/service/klevuHttpServiceInit');
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuSFTPUtils');
const klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsBm');
var config = klevuUtils.config;

/**
 * Check KlevuAPI Availablility
 * @returns {string} status
 */
function isKlevuAPIAvailable() {
    var response;
    var serviceCredentials = klevuUtils.getCustomPrefConfig();

    var result = klevuHttpServiceInit.serviceCall(
                                            config.serviceMethod, null, null,
                                            config.backofficeHttpServiceName,
                                            serviceCredentials.restKey,
                                            serviceCredentials.apiKey,
                                            true
                                        );
    try {
        response = JSON.parse(result);
    } catch (error) {
        throw new Error('ERROR : Unable to parse SFTP API service response.');
        return new Status(Status.ERROR);
    }
    if (response && 'host' in response && !empty(response.host)) {
        var ServiceClient = require('dw/net/SFTPClient');
        var client = new ServiceClient();
        client.setTimeout(29000);
        var connected = client.connect(response.host, response.user, response.password);

        if (connected) {
            return new Status(Status.OK);
        } else {
            Logger.error('Some problems connecting SFTP: ' + client.errorMessage);
            return new Status(Status.ERROR);
        }
    } else {
        return new Status(Status.ERROR);
    }
}

module.exports = {
    isKlevuAPIAvailable: isKlevuAPIAvailable
};
