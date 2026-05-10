require('dotenv').config();
const axios = require('axios');

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

async function simulateC2B(phone, amount) {
  const token = await getAccessToken();
  const response = await axios.post(
    'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate',
    {
      ShortCode: process.env.MPESA_SHORTCODE,
      CommandID: 'CustomerPayBillOnline',
      Amount: amount,
      Msisdn: phone,
      BillRefNumber: 'TEST',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('Simulation result:', response.data);
}

// Simulate a payment of KES 70 from a test number (use 2547...)
simulateC2B('254727784395', 70);