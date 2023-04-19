var SuperModel = require('./SearchModel');

var ProductSearchModel = function () {};

ProductSearchModel.prototype = new SuperModel();

ProductSearchModel.prototype.search = function () {};
ProductSearchModel.prototype.getCategory = function () {};
ProductSearchModel.prototype.getSortingRule = function () {};
ProductSearchModel.prototype.getProductSearchHits = function () {};
ProductSearchModel.prototype.getRefinements = function () {};
ProductSearchModel.prototype.setProductID = function () {};
ProductSearchModel.prototype.setSortingRule = function () {};
ProductSearchModel.prototype.productSearchHits = null;

module.exports = ProductSearchModel;
