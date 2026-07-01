require("dotenv").config();
const { registerC2BUrls } = require("../../src/services/darajaService");

async function register() {
  try {
    const result = await registerC2BUrls();
    console.log("Registration successful!");
    console.log("Response:", result);
  } catch (err) {
    console.error("Registration failed:");
    console.error(err.response?.data || err.message);
  }
}

register();