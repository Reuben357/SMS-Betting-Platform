require('dotenv').config();
const axios = require('axios');
const querystring = require('querystring');
const { logger } = require('../middleware/errorHandler');
const { readSecret } = require('../config/secrets');

class EmalifyService {
  constructor() {
    this.baseURL = 'https://api.v2.emalify.com/api/services/sendsms';
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
    const apiKey = readSecret('EMALIFY_API_KEY_FILE', 'EMALIFY_API_KEY');

    const payload = {
      apikey: apiKey,
      partnerID: parseInt(process.env.EMALIFY_PARTNER_ID, 10),
      mobile: this.formatPhoneNumber(phoneNumber),
      message: message,
      shortcode: process.env.EMALIFY_SENDER_ID,
      pass_type: 'plain'
    };

    try {
      const response = await axios.post(
          this.baseURL,
          querystring.stringify(payload),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      logger.info(`SMS sent to ${phoneNumber} via Emalify (status ${response.status})`);
      return { success: true, statusCode: response.status };
    } catch (error) {
      logger.error(`Emalify SMS failed: ${JSON.stringify(error.response?.data || error.message)}`);
      throw error;
    }
  }
}

module.exports = new EmalifyService();