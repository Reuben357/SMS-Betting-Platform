// scripts/test-emalify-v2.js
require('dotenv').config();
const emalifyService = require('../src/services/emalifyService');

async function test() {
  try {
    const result = await emalifyService.sendSMS(
      '254790306848',   // Replace with your test number
      'Hello from JENGATIPS!'
    );
    console.log('SMS request accepted', result);
  } catch (err) {
    console.error(' Failed:', err.message);
  }
}

test();