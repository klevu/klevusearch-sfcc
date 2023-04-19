'use strict';

var ISML = require('dw/template/ISML');
var Logger = require('dw/system/Logger');

/**
 * Template-based hook
 * Should be executed after page footer
 * Renders a template result. No value return is expected.
 * Platform hook execution results in all registered hooks being executed, regardless of any return value.
 * For this to execute, a cartridge's hooks.json must register app.template.htmlHead hook.
 * @param {Object} params Parameters from the template
 */
function afterFooter(params) {
    // NOTE: Template naming is still important, ensure your template is unique
    // Otherwise, an unexpected template may be rendered based on cartridge path
    var templateName = 'hooks/klevuAnalyticsSnippet';
    try {
        ISML.renderTemplate(templateName, params);
    } catch (e) {
        Logger.error('Error while rendering template ' + templateName);
    }
}

exports.afterFooter = afterFooter;
