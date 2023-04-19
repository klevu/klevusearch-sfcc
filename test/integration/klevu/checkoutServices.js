var chai = require('chai');
var config = require('../it.config');
var request = require('request-promise');
var chaiSubset = require('chai-subset');
var assert = chai.assert;
var baseUrl = config.baseUrl;
chai.use(chaiSubset);
var cookieJar = request.jar();

describe('CheckoutServices-PlaceOrder', function () {
    this.timeout(30000);

    it('should successfully place order', function () {
        var addProductRequest = {
            method: 'POST',
            rejectUnauthorized: false,
            resolveWithFullResponse: true,
            jar: cookieJar,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            url: baseUrl + '/Cart-AddProduct',
            form: {
                pid: '701643421084M',
                quantity: 2
            }
        };
        return request(addProductRequest)
        .then(function (addProductResponse) {
            assert.equal(addProductResponse.statusCode, 200, 'Expected add product response code to be 200.');
            var csrfRequest = {
                method: 'POST',
                rejectUnauthorized: false,
                resolveWithFullResponse: true,
                jar: cookieJar,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                url: baseUrl + '/CSRF-Generate'
            };
            var reqData = Object.assign({}, csrfRequest);
            cookieJar.setCookie(request.cookie(cookieJar.getCookieString(reqData.url), reqData.url));
            return request(csrfRequest)
            .then(function (csrfResponse) {
                assert.equal(csrfResponse.statusCode, 200, 'Expected csrf response code to be 200.');
                var csrfJsonResponse = JSON.parse(csrfResponse.body);
                var submitShippingRequest = {
                    method: 'POST',
                    rejectUnauthorized: false,
                    resolveWithFullResponse: true,
                    jar: cookieJar,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    url: baseUrl + '/CheckoutShippingServices-SubmitShipping',
                    form: {
                        shipmentSelector: 'new',
                        dwfrm_shipping_shippingAddress_addressFields_firstName: 'John',
                        dwfrm_shipping_shippingAddress_addressFields_lastName: 'Doe',
                        dwfrm_shipping_shippingAddress_addressFields_address1: '2253 Hudson Street',
                        dwfrm_shipping_shippingAddress_addressFields_address2: '',
                        dwfrm_shipping_shippingAddress_addressFields_country: 'US',
                        dwfrm_shipping_shippingAddress_addressFields_states_stateCode: 'AK',
                        dwfrm_shipping_shippingAddress_addressFields_city: 'Wales',
                        dwfrm_shipping_shippingAddress_addressFields_postalCode: '87024',
                        dwfrm_shipping_shippingAddress_addressFields_phone: '3333333333',
                        dwfrm_shipping_shippingAddress_shippingMethodID: '001',
                        dwfrm_shipping_shippingAddressUseAsBillingAddress: false
                    }
                };
                submitShippingRequest.form[csrfJsonResponse.csrf.tokenName] = csrfJsonResponse.csrf.token;
                return request(submitShippingRequest)
                .then(function (submitShippingResponse) {
                    assert.equal(submitShippingResponse.statusCode, 200, 'Expected submit shipping response code to be 200.');
                    var submitPaymentRequest = {
                        method: 'POST',
                        rejectUnauthorized: false,
                        resolveWithFullResponse: true,
                        jar: cookieJar,
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        url: baseUrl + '/CheckoutServices-SubmitPayment?' +
                            csrfJsonResponse.csrf.tokenName + '=' +
                            csrfJsonResponse.csrf.token,
                        form: {
                            dwfrm_billing_shippingAddressUseAsBillingAddress: 'true',
                            dwfrm_billing_addressFields_firstName: 'John',
                            dwfrm_billing_addressFields_lastName: 'Smith',
                            dwfrm_billing_addressFields_address1: '10 main St',
                            dwfrm_billing_addressFields_address2: '',
                            dwfrm_billing_addressFields_country: 'us',
                            dwfrm_billing_addressFields_states_stateCode: 'MA',
                            dwfrm_billing_addressFields_city: 'burlington',
                            dwfrm_billing_addressFields_postalCode: '09876',
                            dwfrm_billing_paymentMethod: 'CREDIT_CARD',
                            dwfrm_billing_creditCardFields_cardType: 'Visa',
                            dwfrm_billing_creditCardFields_cardNumber: '4111111111111111',
                            dwfrm_billing_creditCardFields_expirationMonth: '2',
                            dwfrm_billing_creditCardFields_expirationYear: '2030.0',
                            dwfrm_billing_creditCardFields_securityCode: '342',
                            dwfrm_billing_contactInfoFields_email: 'blahblah@gmail.com',
                            dwfrm_billing_contactInfoFields_phone: '9786543213'
                        }
                    };
                    return request(submitPaymentRequest)
                    .then(function (submitPaymentResponse) {
                        assert.equal(submitPaymentResponse.statusCode, 200, 'Expected submit billing response code to be 200.');
                        var placeOrderRequest = {
                            method: 'POST',
                            rejectUnauthorized: false,
                            resolveWithFullResponse: true,
                            jar: cookieJar,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            },
                            url: baseUrl + '/CheckoutServices-PlaceOrder'
                        };
                        return request(placeOrderRequest)
                        .then(function (placeOrderResponse) {
                            assert.equal(placeOrderResponse.statusCode, 200, 'Expected place order response code to be 200.');
                        });
                    });
                });
            });
        });
    });
});
