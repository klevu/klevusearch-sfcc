'use strict';

var siteMock = {
    getCurrent: function () {
        return {
            getCustomPreferenceValue: function () {
                return true;
            },
            getDefaultCurrency: function () {
                return true;
            }
        };
    }
};

module.exports = siteMock;
