/**
 * Start the JSON in webdav custom cache to populate data file names
 */

/* Script Includes*/
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');

/**
 * Start JobContent
 * @param {Object} jobParameters - jobParameters
 */
function startJobContent(jobParameters) {
    klevuJobUtils.initJobContent(jobParameters.ExportMode, jobParameters.ObjectTypeName);
}

module.exports = {
    startJobContent: startJobContent
};
