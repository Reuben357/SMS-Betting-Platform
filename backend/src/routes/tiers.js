const express = require("express");
const router = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getTiers,
  updateTiers,
  createActiveTier,
  createActiveSubTier,
  createPotentialTier,
  getJpPotentialTiers,
  updateJpPotentialTiers,
  createJpPotentialTier,
} = require("../controllers/tiersController");

// All users can view tiers
router.get("/", validateToken, syncUser, getTiers);

// Only admin can update tiers
router.put("/", validateToken, syncUser, updateTiers);

router.post("/potential", validateToken, syncUser, createPotentialTier);
router.post("/active", validateToken, syncUser, createActiveTier);
router.post("/active-sub", validateToken, syncUser, createActiveSubTier);

router.get("/jp", validateToken, syncUser, getJpPotentialTiers);
router.put("/jp", validateToken, syncUser, updateJpPotentialTiers);
router.post("/jp", validateToken, syncUser, createJpPotentialTier);


module.exports = router;
