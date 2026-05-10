require("dotenv").config();
const { registerC2BUrls } = require("/home/reuben/Desktop/SMS-Betting-Platform/backend/src/services/darajaService");

registerC2BUrls()
  .then(() => console.log("Registered"))
  .catch((err) => console.error("Failed", err.response?.data || err.message));
