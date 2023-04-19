'use strict';

/* global request */

var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');

var ACTION_ENDPOINT = 'Search-ShowAjax';
var base = module.superModule;

if ((klevuUtils.isKlevuPreserveInUseForSRLP() && request.httpParameterMap.q.value) ||
    (!request.httpParameterMap.q.value && klevuUtils.isKlevuPreserveInUseCategory())) {

    ACTION_ENDPOINT = 'Search-KlevuShowAjax';

    base.prototype.initialize = function () {
        this.id = this.refinementValue.ID;
        this.presentationId = this.refinementValue.presentationID;
        this.value = this.refinementValue.value;
        this.hitCount = this.refinementValue.hitCount;
        this.selectable = this.refinementValue.hitCount > 0;
        this.actionEndpoint = ACTION_ENDPOINT;
    };

    base.prototype.getUrl = function (productSearch, actionEndpoint, id, value, selected, selectable) {
        var url = '';
        if (selected) {
            url = productSearch.urlRelaxAttributeValue(actionEndpoint, id, value)
                .relative().toString();
        } else if (!selectable) {
            url = '#';
        } else {
            url = productSearch.urlRefineAttributeValue(actionEndpoint, id, value)
                .relative().toString();
        }
        url = klevuUtils.appendQueryParam(url);
        return url;
    };
}

module.exports = base;
module.exports.actionEndpoint = ACTION_ENDPOINT;

