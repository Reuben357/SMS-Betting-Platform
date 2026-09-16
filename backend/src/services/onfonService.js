require('dotenv').config();

const axios = require('axios');
const { logger } = require('../middleware/errorHandler');
const { readSecret } = require('../config/secrets');


class OnfonService {
    constructor() {
        this.baseURL = 'https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS';
    }

    formatPhoneNumber(phone) {
        let cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '254' + cleaned.slice(1);
        } else if (cleaned.startsWith('7')) {
            cleaned = '254' + cleaned;
        }
        // Already 254... -> leave as is
        return cleaned;
    }

    async sendSMS(phoneNumber, message) {
        const apiKey = readSecret('ONFON_API_KEY_FILE', 'ONFON_API_KEY');
        const accessKey = readSecret('ONFON_ACCESS_KEY_FILE', 'ONFON_ACCESS_KEY');
        const clientId = process.env.ONFON_CLIENT_ID;
        const senderId = process.env.ONFON_SENDER_ID;

        const payload = {
            SenderId: senderId,
            MessageParameters: [
                {
                    Number: this.formatPhoneNumber(phoneNumber),
                    Text: message,
                },
            ],
            ApiKey: apiKey,
            ClientId: clientId,
        };

        try {
            const response = await axios.post(this.baseURL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    AccessKey: accessKey,
                },
            });

            logger.info(`Onfon full response: ${JSON.stringify(response.data)}`);

            const { ErrorCode, ErrorDescription, Data } = response.data || {};

            // Onfon Media returns ErrorCode 0 on success, non-zero on failure
            // API-level failure
            if (ErrorCode !== 0) {
                const {description, category } = classifyOnfonError(ErrorCode);
                logger.error(`Onfon SMS rejected: code=${ErrorCode} category=${category} description="${ErrorDescription || description}"`);
                throw new Error(`Onfon Media error [${ErrorCode}] ${ErrorDescription || description}`);
            }

            // Per-message failure - API accepted the request but message failed (bad sender ID, IP filter ...)
            const messageResult = Data?.[0];
            const messageErrorCode = messageResult?.MessageErrorCode;

            if (messageErrorCode !== 0 && messageErrorCode !== '0' && messageErrorCode != null) {
                const messageErrorDesc = messageResult?.MessageErrorDescription || 'Message failed';
                logger.error(`Onfon SMS rejected at message level: messageErrorCode=${messageErrorCode} description="${messageErrorDesc}"`);
                throw new Error(`Onfon message error [${messageErrorCode}] ${messageErrorDesc}`);
            }

            const providerId = messageResult?.MessageId || null;
            if (!providerId) {
                logger.warn(`Onfon returned success but no MessageId for ${phoneNumber} cannot track DLR for this send.`);
            } else {
                logger.info(`SMS sent to ${phoneNumber} via Onfon Meida, messageId: ${providerId}`);
            }
            return {
                success: true,
                statusCode: response.status,
                providerId,
            };
        } catch (error) {
            logger.error(`Onfon Media SMS failed ${JSON.stringify({
                message: error.message,
                responseData: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText,
            })}`);
            throw error;
        }
    }
}

const ONFON_ERROR_CODES = {
    0:   { description: 'Success', category: 'success' },
    3:   { description: 'SenderId cannot be blank', category: 'invalid_input' },
    4:   { description: 'Message cannot be blank', category: 'invalid_input' },
    5:   { description: 'Message properties cannot be blank', category: 'invalid_input' },
    6:   { description: 'Something went wrong', category: 'transient' },
    7:   { description: 'Invalid api credential', category: 'auth' },
    8:   { description: 'User account inactive', category: 'auth' },
    9:   { description: 'User account locked, contact your Administrator', category: 'auth' },
    10:  { description: 'Unauthorized API access', category: 'auth' },
    11:  { description: 'Unauthorized IP address', category: 'auth' },
    13:  { description: 'Invalid mobile numbers', category: 'invalid_input' },
    15:  { description: 'Invalid SenderId', category: 'invalid_input' },
    19:  { description: 'Invalid schedule date', category: 'invalid_input' },
    20:  { description: 'Message or mobile number cannot be blank', category: 'invalid_input' },
    21:  { description: 'Insufficient wallet credits', category: 'insufficient_credit' },
    23:  { description: 'Parameter missing', category: 'invalid_input' },
    24:  { description: 'Invalid template or template mismatch', category: 'invalid_input' },
    28:  { description: 'Group can not be found', category: 'invalid_input' },
    29:  { description: 'Record already exists', category: 'invalid_input' },
    30:  { description: 'Account expired', category: 'auth' },
    31:  { description: 'No gateway is assigned', category: 'transient' },
    33:  { description: 'Queue Connection Closed', category: 'transient' },
    34:  { description: 'Unable to create campaign at this time, please try again later', category: 'transient' },
    35:  { description: 'Insufficient credits, contact your Administrator', category: 'insufficient_credit' },
    39:  { description: 'Spam Message Detected', category: 'invalid_input' },
    42:  { description: 'Max Mobile Number limit exceeded', category: 'invalid_input' },
    801: { description: 'Country Undefined', category: 'invalid_input' },
    803: { description: 'Message failed due to undefined price for gateway/user', category: 'transient' },
    804: { description: 'Message failed due to loss protection', category: 'transient' },
    805: { description: 'Message failed due to undefined route', category: 'transient' },
    807: { description: 'Failover loss protection', category: 'transient' },
    808: { description: 'Failover price undefined', category: 'transient' },
    809: { description: 'Failover-Routing message failed', category: 'transient' },
};

function classifyOnfonError(errorCode){
    return ONFON_ERROR_CODES[errorCode] || {
        description: 'Unknown Onfon error code',
        category: 'unknown',
    };
}

module.exports = new OnfonService();
module.exports.classifyOnfonError = classifyOnfonError;
module.exports.ONFON_ERROR_CODES = ONFON_ERROR_CODES;