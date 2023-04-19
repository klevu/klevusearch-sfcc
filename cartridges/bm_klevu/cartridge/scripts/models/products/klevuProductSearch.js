/* global empty */

'use strict';

/**
 * Module for the Custom Job Step for the Product Feed Export
 */

/* API Includes*/
const ProductSearchModel = require('dw/catalog/ProductSearchModel');
const CatalogMgr = require('dw/catalog/CatalogMgr');

/* Script Includes*/
const LogUtils = require('*/cartridge/scripts/utils/klevuLogUtils');
const Logger = LogUtils.getLogger('klevuProductSearch');

/**
 * Object implements default searchModel interface
 * @param {Object} parameters - params for searchModel
 * @return {Object} public api methods
 */
let searchModel = function (parameters) {
    Logger.info('Starting product Search....');

    let isMaster = parameters.productType === 'master';
    let isBundleSet = parameters.productType === 'bundle_set';
    let productSearchHit = require('dw/catalog/ProductSearchHit');
    let productSearchModel = new ProductSearchModel();

    try {
        let siteRootCategory = CatalogMgr.getSiteCatalog().getRoot();
        productSearchModel.setCategoryID(siteRootCategory.ID);
        productSearchModel.setRecursiveCategorySearch(true);
        productSearchModel.setOrderableProductsOnly(true);
        productSearchModel.setPriceMin(0.01);

        if (isMaster) {
            productSearchModel.addHitTypeRefinement(productSearchHit.HIT_TYPE_PRODUCT_MASTER);
        } else if (isBundleSet) {
            productSearchModel.addHitTypeRefinement(productSearchHit.HIT_TYPE_PRODUCT_BUNDLE, productSearchHit.HIT_TYPE_PRODUCT_SET);
        } else { 
            productSearchModel.addHitTypeRefinement(productSearchHit.HIT_TYPE_SIMPLE);
        }
        productSearchModel.search();
    } catch (e) {
        Logger.error('Klevu searchModel() -> failed: ' + e.toString() + ' in ' + e.fileName + ':' + e.lineNumber);
        return false;
    }

    Logger.info('Found {0} {1} products.', productSearchModel.getCount(), parameters.productType);

    var productHits = productSearchModel.getProductSearchHits();
    var searchRefinements = productSearchModel.getRefinements().getAllRefinementDefinitions();
    var searchRefinementsIterator = searchRefinements.iterator();

    var attrRefinementIds = [];
    while (searchRefinementsIterator.hasNext()) {
        var refinementDefinition = searchRefinementsIterator.next();
        if (refinementDefinition.attributeRefinement) {
            attrRefinementIds.push(refinementDefinition.attributeID);
        }
    }
    let representedProducts = [];
    let productHit = null;

    return {
        getNext: function () {
            var result = null;
            var response = null;

            if (productHits.hasNext()) {
                productHit = productHits.next();

                if (isMaster || isBundleSet) {
                    result = productHit.product;
                    response = {
                        product: result,
                        refinementAttributesArray: attrRefinementIds
                    };
                    return response;
                }

                representedProducts = productHit.getRepresentedProducts().toArray();
            }

            if (!empty(representedProducts)) {
                result = representedProducts.pop();
            }
            response = {
                product: result,
                refinementAttributesArray: attrRefinementIds
            };
            return response;
        }
    };
};

module.exports = searchModel;
