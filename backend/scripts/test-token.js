require("dotenv").config();
const axios = require("axios");

async function testToken() {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");
  try {
    const res = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } },
    );
    console.log(
      "Token generated:",
      res.data.access_token?.slice(0, 20) + "...",
    );
  } catch (err) {
    console.error("Token failed:", err.response?.data || err.message);
  }
}
testToken();
