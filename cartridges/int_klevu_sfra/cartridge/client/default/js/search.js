'use strict';

/* global $ */

var processInclude = require('base/util');

$(document).ready(function () {
    processInclude(require('./search/search'));
    processInclude(require('base/product/quickView'));
});
