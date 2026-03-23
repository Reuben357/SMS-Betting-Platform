const express = require("express");
const router = express.Router();
const { validateToken } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getPackages,
  createPackage,
  updatePackage,
  deactivatePackage,
  reactivatePackage,
} = require("../controllers/packagesController");

// All users can view packages
router.get("/", validateToken, syncUser, getPackages);

// Only admin can modify packages
router.post("/", validateToken, syncUser, createPackage);
router.put("/:id", validateToken, syncUser, updatePackage);
router.put("/:id/deactivate", validateToken, syncUser, deactivatePackage);
router.put("/:id/reactivate", validateToken, syncUser, reactivatePackage);

module.exports = router;
