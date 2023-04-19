'use strict';

var ISML = require('dw/template/ISML');
var Logger = require('dw/system/Logger');

function htmlHead(params) {
    // NOTE: Template naming is still important, ensure your template is unique
    // Otherwise, an unexpected template may be rendered based on cartridge path
    var templateName = 'hooks/klevuHtmlHead';
    try {
        ISML.renderTemplate(templateName, params);
    } catch (e) {
        Logger.error('Error while rendering template ' + templateName);
    }
}

exports.htmlHead = htmlHead;