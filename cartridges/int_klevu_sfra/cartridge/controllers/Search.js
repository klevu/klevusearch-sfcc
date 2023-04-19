'use strict';

/**
 * @namespace Search
 */
/* global empty */
/* eslint no-param-reassign: 0 */
/* eslint block-scoped-var: 0 */

var server = require('server');
server.extend(module.superModule);

/* API Includes*/
var ArrayList = require('dw/util/ArrayList');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var CatalogMgr = require('dw/catalog/CatalogMgr');

/* Script Includes*/
var QueryString = require('server/queryString');
var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var klevuUtils = require('~/cartridge/scripts/utils/klevuUtilsStore');

var refinementsResp;
var refinedProductsList = [];

/**
 * Updates the search model with the preference refinement values
 *
 * @param {dw.catalog.SearchModel} search - SearchModel instance
 * @param {Object} preferences - Query params map
 */
function addRefinementValues(search, preferences) {
    Object.keys(preferences).forEach(function (key) {
        search.addRefinementValues(key, preferences[key]);
    });
}

/**
 * Sets the relevant product search model properties, depending on the parameters provided
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - Query params
 * @param {dw.catalog.Category} selectedCategory - Selected category
 * @param {Object} httpParameterMap - Query params
 * @property {Double} [httpParameterMap.pmin] - Minimum Price
 * @property {Double} [httpParameterMap.pmax] - Maximum Price
 * @return {boolean} - refined or not
 */
function setProductProperties(productSearch, httpParams, selectedCategory, httpParameterMap) {
    var refined = false;
    if (selectedCategory) {
        productSearch.setCategoryID(selectedCategory.ID);
        if (httpParams.isCategoryRefinement) {
            refined = true;
        }
    }
    if (httpParams.pid) {
        productSearch.setProductIDs([httpParams.pid]);
        refined = true;
    }
    if (httpParameterMap) {
        if (httpParameterMap.pmin.doubleValue) {
            productSearch.setPriceMin(httpParameterMap.pmin.doubleValue);
            refined = true;
        }
        if (httpParameterMap.pmax.doubleValue) {
            productSearch.setPriceMax(httpParameterMap.pmax.doubleValue);
            refined = true;
        }
    }
    if (httpParams.pmid) {
        productSearch.setPromotionID(httpParams.pmid);
        refined = true;
    }

    productSearch.setRecursiveCategorySearch(true);
    return refined;
}

/**
 * Set search configuration values
 *
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - API search instance
 * @param {Object} params - Provided HTTP query parameters
 * @param {Object} httpParameterMap - Query params
 * @return {boolean} - refined or not
 */
function setupSearch(apiProductSearch, params, httpParameterMap) {
    var selectedCategory = CatalogMgr.getCategory(params.cgid);
    selectedCategory = selectedCategory && selectedCategory.online ? selectedCategory : null;

    var refined = setProductProperties(apiProductSearch, params, selectedCategory, httpParameterMap);

    if (params.preferences) {
        addRefinementValues(apiProductSearch, params.preferences);
        refined = refined || true;
    }

    return refined;
}

/**
 * Set refinements  to a generic object based on the product Ids set in ProductSearchModel API
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {dw.catalog.ProductSearchRefinements} refinements - Search refinements
 * @param {ArrayList.<dw.catalog.ProductSearchRefinementDefinition>} refinementDefinitions - List of product search refinement definitions
 * @return {Object} - Refinement result
 */
function setRefinements(productSearch, refinements, refinementDefinitions) {
    var searchRefinementsFactory = require('*/cartridge/scripts/factories/searchRefinements');
    var result = [];

    for (var i = 0; i < refinementDefinitions.length; i++) {
        var definition = refinementDefinitions[i];
        var refinementValues = refinements.getAllRefinementValues(definition);
        var values = searchRefinementsFactory.get(productSearch, definition, refinementValues);

        if (values && values.length) {
            result.push({
                displayName: definition.displayName,
                isCategoryRefinement: definition.categoryRefinement,
                isAttributeRefinement: definition.attributeRefinement,
                isPriceRefinement: definition.priceRefinement,
                isPromotionRefinement: definition.promotionRefinement,
                values: values
            });
        }
    }
    return result;
}

/**
 * Merge Category Refinements result objects
 * @param {Object} newCategoryRefinement - newCategoryRefinement
 * @param {Object} oldCategoryRefinement - oldCategoryRefinement
 */
function mergeCategoryRefinements(newCategoryRefinement, oldCategoryRefinement) {
    if (!oldCategoryRefinement.selectable && newCategoryRefinement.selectable) {
        oldCategoryRefinement.selectable = newCategoryRefinement.selectable;
        oldCategoryRefinement.title = newCategoryRefinement.title;
        oldCategoryRefinement.url = newCategoryRefinement.url;
    }
    var newSubCategories = newCategoryRefinement.subCategories;
    var oldSubCategories = oldCategoryRefinement.subCategories;
    for (var m = 0; m < newSubCategories.length; m++) {
        var newCategory = newSubCategories[m];
        var oldCategory = null;

        for (var n = 0; n < oldSubCategories.length; n++) {
            if (oldSubCategories[n].displayValue === newCategory.displayValue) {
                oldCategory = oldSubCategories[n];
                break;
            }
        }
        if (!oldCategory) {
            oldSubCategories.push(newCategory);
        } else {
            mergeCategoryRefinements(newCategory, oldCategory);
        }
    }
}

/**
 * Get refinements based on the product Ids set in ProductSearchModel API
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {dw.catalog.ProductSearchRefinements} refinements - Search refinements
 * @param {ArrayList.<dw.catalog.ProductSearchRefinementDefinition>} refinementDefinitions - List of
 *     product search refinement definitions
 * @returns {Object} refinementsContainer - merged refinements list
 */
function getRefinements(productSearch, refinements, refinementDefinitions) {
    var refinementResponse;
    if (empty(refinementsResp)) {
        refinementResponse = setRefinements(productSearch, refinements, refinementDefinitions);
    } else {
        refinementResponse = refinementsResp;
        var newRefinements = setRefinements(productSearch, refinements, refinementDefinitions);

        for (var i = 0; i < newRefinements.length; i++) {
            var newRefinement = newRefinements[i];
            var oldRefinement = null;
            if (newRefinement) {
                for (var j = 0; j < refinementResponse.length; j++) {
                    if (refinementResponse[j].displayName === newRefinement.displayName) {
                        oldRefinement = refinementResponse[j];
                        break;
                    }
                }
                if (!oldRefinement) {
                    refinementResponse.push(newRefinement);
                } else {
                    for (var k = 0; k < newRefinement.values.length; k++) {
                        var newRefinementValue = newRefinement.values[k];
                        var oldRefinementValue = null;
                        for (var l = 0; l < oldRefinement.values.length; l++) {
                            if (oldRefinement.values[l].displayValue === newRefinementValue.displayValue) {
                                oldRefinementValue = oldRefinement.values[l];
                                break;
                            }
                        }
                        if (!oldRefinementValue) {
                            oldRefinement.values.push(newRefinementValue);
                        } else if (!newRefinement.isCategoryRefinement && !oldRefinementValue.selectable &&
                            newRefinementValue.selectable) {
                            oldRefinementValue.selectable = newRefinementValue.selectable;
                            oldRefinementValue.title = newRefinementValue.title;
                            oldRefinementValue.url = newRefinementValue.url;
                        } else if (newRefinement.isCategoryRefinement) {
                            mergeCategoryRefinements(newRefinementValue, oldRefinementValue);
                        }
                    }
                }
            }
        }
    }
    return refinementResponse;
}

/**
 * Get consolidated refinements list for Klevu products
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - Product search object
 */
function processRefinements(apiProductSearch) {
    refinementsResp = getRefinements(apiProductSearch, apiProductSearch.refinements,
        apiProductSearch.getRefinements().getAllRefinementDefinitions());
}

/**
 * Add products from Klevu to a productSearchModel API based on the count
 * @param {dw.catalog.ProductSearchModel} apiProductSearch - Product search object
 * @param {Array} klevuProductIDs - Products IDs returned by klevu
 * @param {Object} req - request object
 * @param {boolean} ajaxCall - flag to indicate whether its an ajax call
 */
function addProductsToProductSearchModel(apiProductSearch, klevuProductIDs, req, ajaxCall) {
    if (klevuProductIDs.length) {
        var refined = setupSearch(apiProductSearch, req.querystring, req.httpParameterMap);

        apiProductSearch.setProductIDs(new ArrayList(klevuProductIDs.slice(0, ProductSearchModel.MAXIMUM_PRODUCT_IDS)));
        apiProductSearch.search();
        if (refined && !empty(apiProductSearch.productSearchHits)) {
            var productsIterator = apiProductSearch.productSearchHits;
            while (productsIterator.hasNext()) {
                var productSearchHit = productsIterator.next();
                refinedProductsList.push(productSearchHit.productID);
            }
        } else if (!empty(apiProductSearch.productSearchHits)) {
            refinedProductsList = refinedProductsList.concat(klevuProductIDs.slice(0, ProductSearchModel.MAXIMUM_PRODUCT_IDS));
        }
        processRefinements(apiProductSearch);
        if (klevuProductIDs.length > ProductSearchModel.MAXIMUM_PRODUCT_IDS) {
            addProductsToProductSearchModel(apiProductSearch, klevuProductIDs.slice(ProductSearchModel.MAXIMUM_PRODUCT_IDS), req, ajaxCall);
        }
    }
}

/**
 * @description Get category display name path
 * @param {dw.catalog.Category} category - category
 * @returns {Array} - array of category display name path
 */
function getCategoryDisplayNamePath(category) {
    if (category.ID === 'root') return [];

    var output = [category.displayName];
    if (category.parent) {
        output = this.getCategoryDisplayNamePath(category.parent).concat(output);
    }
    return output;

}

/**
 * Search-UpdateGrid : This endpoint is called when the shopper changes the "Sort Order" or clicks "More Results" on the Product List page
 * @name Base/Search-UpdateGrid
 * @function
 * @memberof Search
 * @param {querystringparameter} - cgid - Category ID
 * @param {querystringparameter} - srule - Sort Rule ID
 * @param {querystringparameter} - start - Offset of the Page
 * @param {querystringparameter} - sz - Number of Products to Show on the List Page
 * @param {querystringparameter} - prefn1, prefn2 ... prefn(n) - Names of the selected preferences e.g. refinementColor. These will be added to the query parameters only when refinements are selected
 * @param {querystringparameter} - prefv1, prefv2 ... prefv(n) - Values of the selected preferences e.g. Blue. These will be added to the query parameters only when refinements are selected
 * @param {querystringparameter} - selectedUrl - The URL generated with the query parameters included
 * @param {category} - non-sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.post('KlevuUpdateGrid', function (req, res, next) {
    var bodyObject = new QueryString(req.body);
    var ProductSearch = require('*/cartridge/models/search/productSearch');

    var apiProductSearch = new ProductSearchModel();
    if ((klevuUtils.isKlevuPreserveInUseForSRLP() || klevuUtils.isKlevuPreserveInUseCategory()) &&
        bodyObject.klevuProducts && bodyObject.klevuProductsCount) {

        var klevuProducts = bodyObject.klevuProducts;
        var klevuProductIDs = klevuProducts.split(',');
        addProductsToProductSearchModel(apiProductSearch, klevuProductIDs, req, true);

        var productSearch = new ProductSearch(
            apiProductSearch,
            req.querystring,
            req.querystring.srule,
            CatalogMgr.getSortingOptions(),
            CatalogMgr.getSiteCatalog().getRoot(),
            refinementsResp,
            refinedProductsList.join(','),
            refinedProductsList.length
        );
    }

    res.render('/search/productGrid', {
        productSearch: productSearch
    });

    next();
});

/**
 * Search-ShowAjax : This endpoint is called when a shopper click on any of the refinement eg. color, size, categories
 * @name Base/Search-ShowAjax
 * @function
 * @memberof Search
 * @param {middleware} - cache.applyShortPromotionSensitiveCache
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - cgid - Category ID
 * @param {querystringparameter} - q - query string a shopper is searching for
 * @param {querystringparameter} - prefn1, prefn2 ... prefn(n) - Names of the selected preferences e.g. refinementColor. These will be added to the query parameters only when refinements are selected
 * @param {querystringparameter} - prefv1, prefv2 ... prefv(n) - Values of the selected preferences e.g. Blue. These will be added to the query parameters only when refinements are selected
 * @param {querystringparameter} - pmin - preference for minimum amount
 * @param {querystringparameter} - pmax - preference for maximum amount
 * @param {querystringparameter} - page
 * @param {querystringparameter} - selectedUrl - The URL generated with the query parameters included
 * @param {category} - non-sensitive
 * @param {serverfunction} - get
 */
server.post('KlevuShowAjax', cache.applyShortPromotionSensitiveCache, consentTracking.consent, function (req, res, next) {
    var bodyObject = new QueryString(req.body);
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
    var apiProductSearch = new ProductSearchModel();

    if ((klevuUtils.isKlevuPreserveInUseForSRLP() || klevuUtils.isKlevuPreserveInUseCategory()) &&
        bodyObject.klevuProducts && bodyObject.klevuProductsCount) {

        var klevuProducts = bodyObject.klevuProducts;
        var klevuProductIDs = klevuProducts.split(',');
        addProductsToProductSearchModel(apiProductSearch, klevuProductIDs, req, true);

        var result = searchHelper.ajaxCallSearch(req, res, apiProductSearch, refinementsResp,
            refinedProductsList,
            refinedProductsList.length);
        if (result.searchRedirect) {
            res.redirect(result.searchRedirect);
            return next();
        }
        result.refineurl.append('klevuProductIds', bodyObject.klevuProducts);
        result.refineurl.append('klevuProductsCount', bodyObject.klevuProductsCount);

        res.render('search/searchResultsNoDecorator', {
            productSearch: result.productSearch,
            maxSlots: result.maxSlots,
            reportingURLs: result.reportingURLs,
            refineurl: result.refineurl
        });
    }

    return next();
}, pageMetaData.computedPageMetaData);


/**
 * Search-Show : This endpoint is called when a shopper type a query string in the search box
 * @name Base/Search-Show
 * @function
 * @memberof Search
 * @param {middleware} - cache.applyShortPromotionSensitiveCache
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - q - query string a shopper is searching for
 * @param {querystringparameter} - search-button
 * @param {querystringparameter} - lang - default is en_US
 * @param {querystringparameter} - cgid - Category ID
 * @param {category} - non-sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.append('Show', function (req, res, next) {
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');

    //Klevu is disabled
    if (!klevuUtils.config.enableKlevuStorefront || !klevuUtils.isKlevuInUse()) {
        return next();
    }

    var isCategorySearch;
    var klevuSearchTerm;
    var useKlevuPreserveTheme = false;
    var klevuCategoryDisplayNamePath = null;
    var klevuCategoryPathSeparator = ';';

    var selectedCategory = CatalogMgr.getCategory(req.querystring.cgid);
    selectedCategory = selectedCategory && selectedCategory.online ? selectedCategory : null;

    if (req.querystring.q) {
        isCategorySearch = false;
        klevuSearchTerm = req.querystring.q;
    } else if (selectedCategory) {
        isCategorySearch = true;
        klevuSearchTerm = req.querystring.cgid;
    }

    if (req.querystring.q) {
        if (klevuUtils.config.klevuSearchResultPageLayout == 'KLEVU_JS_THEME') {
            useKlevuPreserveTheme = false;
            res.render('klevu/klevuJSSearchPageTemplate', {
                query: req.querystring.q
            });

        } else if (klevuUtils.config.klevuSearchResultPageLayout == 'KLEVU_PRESERVE_STORE_THEME') {
            useKlevuPreserveTheme = true;
        } else {
            useKlevuPreserveTheme = false;
        }
    } else if (isCategorySearch && selectedCategory) {
        if (klevuUtils.config.klevuCategoryPageLayout == 'KLEVU_JS_THEME_CATNAV') {
            klevuCategoryDisplayNamePath = getCategoryDisplayNamePath(selectedCategory).join(klevuCategoryPathSeparator);
            if (!klevuCategoryDisplayNamePath && req.querystring.srule) {
                var ruleCategory = CatalogMgr.getCategory(req.querystring.srule);
                var ruleCategoryPath = ruleCategory ? ruleCategory.displayName : null;
                klevuCategoryDisplayNamePath = ruleCategoryPath ? ruleCategoryPath : null;
            }
            useKlevuPreserveTheme = false;
            res.render('klevu/klevuJSCategoryPagesTemplate', {
                isCategorySearch: isCategorySearch,
                cgid: req.querystring.cgid,
                selectedCategory: selectedCategory ? selectedCategory.displayName : null,
                categoryPath: klevuCategoryDisplayNamePath ? klevuCategoryDisplayNamePath : null
            });
        } else if (klevuUtils.config.klevuCategoryPageLayout == 'KLEVU_PRESERVE_STORE_THEME_CATNAV') {
            useKlevuPreserveTheme = true;
        } else {
            useKlevuPreserveTheme = false;
        }

    } else {
        useKlevuPreserveTheme = false;
    }

    if (useKlevuPreserveTheme) {

        var template = 'search/searchResults';
        var apiProductSearch = new ProductSearchModel();


        var apiResult = klevuUtils.getAllSearchResults(klevuSearchTerm, isCategorySearch);

        if (!apiResult) {
            res.render('klevu/klevuErrorPage');
            return next();
        }
        var resultValue = apiResult.queryResults[0].records;
        var klevuProductIDs = resultValue.map(function (item) {
            return item.itemGroupId;
        });
        addProductsToProductSearchModel(apiProductSearch, klevuProductIDs, req, true);
        var result = searchHelper.ajaxCallSearch(req, res, apiProductSearch, refinementsResp,
            refinedProductsList,
            refinedProductsList.length);
        result.productSearch.klevuSearchTerm = klevuSearchTerm;
        result.productSearch.klevuProducts = klevuProductIDs.join(',');
        if (selectedCategory) {
            result.productSearch.category = {
                name: selectedCategory.displayName,
                id: selectedCategory.ID,
                pageTitle: selectedCategory.pageTitle,
                pageDescription: selectedCategory.pageDescription,
                pageKeywords: selectedCategory.pageKeywords,
                klevuCategoryDisplayName: getCategoryDisplayNamePath(selectedCategory).join(klevuCategoryPathSeparator)
            };
        }

        if (result.searchRedirect) {
            res.redirect(result.searchRedirect);
            return next();
        }

        if (result.category && result.categoryTemplate) {
            template = result.categoryTemplate;
        }

        var redirectGridUrl = searchHelper.backButtonDetection(req.session.clickStream);
        if (redirectGridUrl) {
            res.redirect(redirectGridUrl);
        }

        res.render(template, {
            productSearch: result.productSearch,
            maxSlots: result.maxSlots,
            reportingURLs: result.reportingURLs,
            refineurl: result.refineurl,
            category: result.category ? result.category : null,
            canonicalUrl: result.canonicalUrl,
            schemaData: result.schemaData,
            apiProductSearch: result.apiProductSearch,
            typeOfSearch: apiResult.queryResults[0].meta.typeOfSearch
        });
    }

    return next();
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();