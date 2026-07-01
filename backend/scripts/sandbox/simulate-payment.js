require("dotenv").config();
const { simulateC2B } = require("../../src/services/darajaService");

async function simulate() {
  try {
    const result = await simulateC2B("254727784395", 40, "BuyGoods");
    console.log("Simulation successful!");
    console.log("Response:", result);
  } catch (err) {
    console.error("Simulation failed:");
    console.error(err.response?.data || err.message);
  }
}

simulate();