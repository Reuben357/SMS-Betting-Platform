const axios = require('axios');
const { logger } = require('../middleware/errorHandler');

class EmalifyService {
  constructor() {
    this.baseURL = 'https://api.v2.emalify.com/api/services/sendsms';
  }

  /**
   * Send an SMS using Emalify V2.
   * @param {string} phoneNumber - Recipient phone (e.g., 254727784395)
   * @param {string} message - SMS content
   * @returns {Promise<{success: boolean, statusCode: number}>}
   */

  async sendSMS(phoneNumber, message) {
    const querystring = require('querystring');

    const payload = {
      apikey: process.env.EMALIFY_API_KEY,
      partnerID: parseInt(process.env.EMALIFY_PARTNER_ID, 10),
      mobile: this.formatPhoneNumber(phoneNumber),
      message: message,
      shortcode: process.env.EMALIFY_SENDER_ID,
      pass_type: "plain"
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
}

module.exports = new EmalifyService();