'use strict';

var URLUtils = require('dw/web/URLUtils');
var ProductFactory = require('*/cartridge/scripts/factories/product');
var urlHelper = require('*/cartridge/scripts/helpers/urlHelpers');
var ProductMgr = require('dw/catalog/ProductMgr');
var Site = require('dw/system/Site');

var klevuAnalytics = {};
var productMetadata = [];
var filterMetadata = [];

klevuAnalytics.config = {
    "system" : "sfcc",
    "pluginVersion" : "21.2.0",
}

/**
 * Return the static path for sorting rules based categories
 * @param {*} path 
 * @returns String with category path
 */
klevuAnalytics.getStaticCategoryPaths = function(path) {
    var staticPath = '';
    if(!empty(path)) {
        staticPath = path.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return staticPath;
}

/**
 * Get product data globally
 * @param {*} product Product
 * @returns Object with product data
 */
klevuAnalytics.getProductData = function(product) {
    if(product) {
        var itemGroupIdToItemId = Site.current.getCustomPreferenceValue('klevuItemGroupIdToItemId') || false;
        var isPrependFlag = (itemGroupIdToItemId && itemGroupIdToItemId.value === "true");
        var masterId;

        // Get the first variant if the product is master - Applies in CLP and PDP
        if (product.productType === 'master') {
            var productVariationModel = ProductMgr.getProduct(product.id).getVariationModel();
            var defaultVariant = productVariationModel.getDefaultVariant();
            masterId = product.id;
            
            // Set the product to the default variant or first one
            product = defaultVariant ? ProductFactory.get({pid: defaultVariant.ID}) : product;
        } 

        // If this vas master product then use the masterId of the product itself and don't query the master product for the variation
        var itemId = (isPrependFlag && product.productType === 'variant') ? masterId ? masterId + '-' + product.id : this.getMasterProductId(product.id) + '-' + product.id : product.id;
        
        return {
            // Prepend itemGroupId to itemId if the flag is set (used for Recs and Analytics)
            itemId : itemId,
            itemName : product.productName,
            itemSalesPrice : product.price && product.price.sales ? product.price.sales.decimalPrice : '',
            itemCurrency : product.price && product.price.sales ? product.price.sales.currency : '',
        }
    }
}

/**
 * Get product metadata JSON to be injected in the header script for Klevy Analytics (klevu_meta)
 * @param {*} productIds Product IDs of the search model 
 * @returns String of JSON object
 */
klevuAnalytics.getProductsMetadata = function(productIds) {
    var productIds = JSON.parse(productIds);

    productIds.forEach(productId => {
        var product, productData;
        var productUrl;
        var quickViewUrl;
        var productMeta ={};

        try {
            product = ProductFactory.get({pid: productId.productID});
            productData = this.getProductData(product);
            productUrl = URLUtils.abs('Product-Show', 'pid', product.id).toString();
            quickViewUrl = URLUtils.abs('Product-ShowQuickView', 'pid', product.id).relative().toString();

            productMeta.itemName = productData.itemName;
            productMeta.itemUrl = productUrl;
            productMeta.itemId = productData.itemId;
            productMeta.itemSalePrice = productData.itemSalePrice;
            productMeta.itemCurrency = productData.itemCurrency;
            if(product.productType == 'variant') {
                productMeta.itemGroupId = this.getMasterProductId(product.id);
            }
            productMetadata.push(productMeta);
        } catch(e) {
            product = false;
            productUrl = URLUtils.abs('Home-Show');
            quickViewUrl = URLUtils.abs('Home-Show');
        }
    });
    return JSON.stringify(productMetadata, null, 2).replace(/"([^"]+)":/g, '$1:');
}

/**
 * Get current applied filters
 * @param {*} refinements Refinements object from the controller 
 * @returns JSON object with type, name and values
 */
klevuAnalytics.getActiveFilters = function(refinements) {
    refinements.forEach(refinement => {
        var filterMeta = {};
        filterMeta.type = refinement.type || '';
        filterMeta.name = refinement.id || '';
        filterMeta.values = refinement.displayValue || '';
        filterMetadata.push(filterMeta);
    });

    return JSON.stringify(filterMetadata, null, 10).replace(/"([^"]+)":/g, '$1:');
}

klevuAnalytics.getRequestUrl = function(link, searchTerm) {
    return urlHelper.appendQueryParams(link, {q : searchTerm});
}

/**
 * Appending parameters to a URL (sorting rule, brand, price ...)
 * @param {*} url permalink url generated in SFCC or any url to append parameters to it
 * @returns Formatted URL with included parameters
 */
klevuAnalytics.getCategoryUrlParams = function (url) {
    var parameters = {};
    var formattedUrl;
    if (request.httpParameterMap.srule) {
        parameters.srule = request.httpParameterMap.srule.value;
    }
    formattedUrl = urlHelper.appendQueryParams(url, parameters);
    return formattedUrl;
}

/**
 * Get product metadata - used in Product Detail Page
 * @param {*} product Product (SFCC product)
 * @returns JSON with product metadata
 */
klevuAnalytics.getProductMetadata = function(product) {
    var productMeta = {};
    var productData;

    if (product) {
        try {
            productData = this.getProductData(product);
            productMeta.itemName = productData.itemName;
            productMeta.itemUrl = URLUtils.abs('Product-Show', 'pid', product.id).toString();
            productMeta.itemId = productData.itemId;
            if(product.productType == 'variant') {
                productMeta.itemGroupId = this.getMasterProductId(product.id);
            }

            if (product.price.sales) {
                productMeta.itemSalePrice = productData.itemSalesPrice;
                productMeta.itemCurrency = productData.itemCurrency;
            }
            productMetadata.push(productMeta);
        } catch(e) {
            return JSON.stringify([]);
        }
    }
    return JSON.stringify(productMetadata, null, 2).replace(/"([^"]+)":/g, '$1:');
}

/**
 * Get the cart products metadata
 * @param {*} products Basket products (SFCC)
 * @returns JSON with cart metadata
 */
klevuAnalytics.getCartMetadata = function(products) {
    if (products.size() > 0) {
        products.toArray().forEach(product => {
            var productMeta = {};
            var productData = this.getProductData(product);
            productMeta.itemName = productData.itemName;
            productMeta.itemUrl = URLUtils.abs('Product-Show', 'pid', product.id).toString();
            productMeta.itemId = productData.itemId;
            productMeta.itemSalePrice = productData.itemSalesPrice;
            productMeta.itemCurrency = productData.itemCurrency;
            if(product.productType == 'variant') {
                productMeta.itemGroupId = this.getMasterProductId(product.id);
            }
            productMetadata.push(productMeta)
        });
    }
    
    return JSON.stringify(productMetadata, null, 2).replace(/"([^"]+)":/g, '$1:');
}

/**
 * Get the cart products metadata
 * @param {*} products Basket products (SFCC)
 * @returns JSON with cart metadata
 */
 klevuAnalytics.getCartMetadatav1 = function(products) {
    if (products.size() > 0) {
        products.toArray().forEach(product => {
            var productMeta = {};
            productMeta.itemId = this.getProductData(product).itemId;
            if(product.productType == 'variant') {
                productMeta.itemGroupId = ProductMgr.getProduct(product.id).masterProduct.ID;
            }
            productMetadata.push(productMeta)
        });
    }
    
    return JSON.stringify(productMetadata, null, 2).replace(/"([^"]+)":/g, '$1:');
}

/**
 * Metadata v1 generation - TODO : To be removed
 * @param {*} productIds - Ids of the products 
 * @returns JSON with product metadata
 */
klevuAnalytics.getMetadatav1Products = function(productIds) {
    if (!empty(productIds)) {
        productIds = JSON.parse(productIds);
        productIds.forEach(productId => {
            var product;
            var productMeta ={};
    
            try {
                product = ProductFactory.get({pid: productId.productID});
                productMeta.itemId = this.getProductData(product).itemId;
                if(product.productType == 'variant') {
                    productMeta.itemGroupId = this.getMasterProductId(product.id); 
                }
                productMetadata.push(productMeta);
            } catch(e) {
                product = false;
            }
        });
        return JSON.stringify(productMetadata, null, 2).replace(/"([^"]+)":/g, '$1:');
    }
}

/**
 * Get master product id
 * @param {*} productId Product id
 * @returns Master product id
 */
klevuAnalytics.getMasterProductId = function(productId) {
    return ProductMgr.getProduct(productId).masterProduct.ID;
}

/**
 * Get the category path even if klevu JS theme or preserve layout is not used 
 * @param {*} productSearch ProductSearch
 * @returns {categoryPath} Category path string format
 */
klevuAnalytics.getCategoryPath = function(productSearch) {
    var categoryPath;
    var srule = request.httpParameterMap.srule;
    if(srule && !srule.empty) return this.getStaticCategoryPaths(request.httpParameterMap.srule.value);
    if(productSearch.isCategorySearch) {
        categoryPath = this.getCategoryDisplayNamePath(productSearch.productSearch.category).join(";");
    }
    return categoryPath;
}

/**
 * Return category path up to the root
 * @param {*} category Category
 * @returns Category path
 */
klevuAnalytics.getCategoryDisplayNamePath = function(category) {
    if (category.ID === 'root') return [];

    var output = [category.displayName];
    if (category.parent) {
        output = this.getCategoryDisplayNamePath(category.parent).concat(output);
    }
    return output;
}

module.exports = klevuAnalytics;