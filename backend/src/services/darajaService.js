require('dotenv').config();
const axios = require('axios');
const { logger } = require('../middleware/errorHandler');
const { readSecret } = require('../config/secrets');

const DARAJA_BASE_URL = process.env.MPESA_ENVIRONMENT === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';


// Get OAuth token
const getAccessToken = async () => {
    const consumerKey = readSecret('MPESA_CONSUMER_KEY_FILE', 'MPESA_CONSUMER_KEY');
    const consumerSecret = readSecret('MPESA_CONSUMER_SECRET_FILE', 'MPESA_CONSUMER_SECRET');
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(
            `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            { headers: { Authorization: `Basic ${auth}` } }
        );
        return response.data.access_token;
    } catch (error) {
        logger.error('Token generation failed:', {
            message: error.message,
            responseData: error.response?.data,
        });
        throw error;
    }
};

// Register callback URLs
const registerC2BUrls = async () => {
    if (process.env.MPESA_CALLBACK_OWNER !== 'self') {
        throw new Error("registerC2BUrls() blocked — MPESA_CALLBACK_OWNER is not 'self'.");
    }

    const token = await getAccessToken();

    try {
        const response = await axios.post(
            `${DARAJA_BASE_URL}/mpesa/c2b/v1/registerurl`,
            {
                ShortCode: process.env.MPESA_SHORTCODE,
                ResponseType: 'Completed',
                ConfirmationURL: `${process.env.APP_BASE_URL}/api/payments/c2b-confirmation/${process.env.MPESA_CALLBACK_SECRET_PATH}`,
                ValidationURL: `${process.env.APP_BASE_URL}/api/payments/c2b-validation/${process.env.MPESA_CALLBACK_SECRET_PATH}`,
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        logger.error('C2B Registration failed:', {
            message: error.message,
            responseData: error.response?.data,
        });
        throw error;
    }
};

const simulateC2B = async (
    phoneNumber,
    amount,
    commandType = 'BuyGoods'
) => {

    if (process.env.MPESA_ENVIRONMENT === 'production') {
        throw new Error('simulateC2B is not available in production');
    }

    const token = await getAccessToken();

    // Build base payload
    let payload = {
        ShortCode: process.env.MPESA_SHORTCODE,
        Amount: amount,
        Msisdn: phoneNumber,
    };

    if (commandType === 'Paybill') {
        payload.CommandID = 'CustomerPayBillOnline';
        payload.BillRefNumber = 'TEST';
    } else if (commandType === 'BuyGoods') {
        payload.CommandID = 'CustomerBuyGoodsOnline';
    } else {
        throw new Error("Invalid commandType. Use 'Paybill' or 'BuyGoods'.");
    }

    try {
        const response = await axios.post(
            `${DARAJA_BASE_URL}/mpesa/c2b/v1/simulate`,
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        logger.error('Simulation failed:', {
            message: error.message,
            responseData: error.response?.data,
        });
        throw error;
    }
};

module.exports = { getAccessToken, registerC2BUrls, simulateC2B };