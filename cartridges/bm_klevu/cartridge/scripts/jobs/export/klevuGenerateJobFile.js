/**
 * Generates Job file from webdav custom cache
 */

/* Script Includes*/
const klevuJobUtils = require('~/cartridge/scripts/utils/klevuJobUtils');

/**
 * Generate JobFile
 * @param {Object} jobParameters - jobParameters
 */
function generateJobFile(jobParameters) {
    klevuJobUtils.createJobDetailsXml(jobParameters.ExportMode, jobParameters.ObjectTypeName);
}

module.exports = {
    generateJobFile: generateJobFile
};
