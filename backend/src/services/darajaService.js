const axios = require("axios");
require("dotenv").config();

// Get OAuth token
const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  
  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Token generation failed:", error.response?.data || error.message);
    throw error;
  }
};

// Register callback URLs
const registerC2BUrls = async () => {
  const token = await getAccessToken();
  
  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        ShortCode: process.env.MPESA_SHORTCODE,
        ResponseType: "Completed",
        ConfirmationURL: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/c2b-confirmation`,
        ValidationURL: `${process.env.NEXT_PUBLIC_API_URL}/api/payments/c2b-validation`,
      },
      { headers: { Authorization: `Bearer ${token}` } } 
    );
    return response.data;
  } catch (error) {
    console.error("C2B Registration failed:", error.response?.data || error.message);
    throw error;
  }
};

// Simulate a C2B payment (for testing)
// const simulateC2B = async (phoneNumber, amount) => {
//   const token = await getAccessToken();
  
//   try {
//     const response = await axios.post(
//       "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate",
//       {
//         ShortCode: process.env.MPESA_SHORTCODE, 
//         CommandID: "CustomerBuyGoodsOnline",
//         Amount: amount,
//         Msisdn: phoneNumber,
//         AccountReference: "TEST",
//       },
//       { headers: { Authorization: `Bearer ${token}` } }
//     );
//     return response.data;
//   } catch (error) {
//     console.error("Simulation failed:", error.response?.data || error.message);
//     throw error;
//   }
// };

// Simulate a C2B payment

const simulateC2B = async (
  phoneNumber, 
  amount, 
  commandType = "BuyGoods"
) => {
  const token = await getAccessToken();

  // Build base payload
  let payload = {
    ShortCode: process.env.MPESA_SHORTCODE,
    Amount: amount,
    Msisdn: phoneNumber,
  };

  if (commandType === "Paybill") {
    payload.CommandID = "CustomerPayBillOnline";
    payload.BillRefNumber = "TEST";
  } else if (commandType === "BuyGoods") {
    payload.CommandID = "CustomerBuyGoodsOnline";
  } else {
    throw new Error("Invalid commandType. Use 'Paybill' or 'BuyGoods'.");
  }

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate",
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error("Simulation failed:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = { getAccessToken, registerC2BUrls, simulateC2B };