const axios = require("axios");
require("dotenv").config();

// Get OAuth token (required for every Daraja API call)
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");
  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${auth}` } },
  );
  return response.data.access_token;
};

// Register your callback URLs with Safaricom (one‑time setup)
const registerC2BUrls = async () => {
  const token = await getAccessToken();
  const response = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
    {
      ShortCode: process.env.MPESA_SHORTCODE,
      ResponseType: "Completed", // 'Completed' auto‑approves; use 'Canceled' if you need external validation
      ConfirmationURL: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/c2b-confirmation`,
      ValidationURL: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/c2b-validation`, // optional
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return response.data;
};

module.exports = { getAccessToken, registerC2BUrls };
