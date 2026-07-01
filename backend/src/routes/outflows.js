const express = require("express");
const router  = express.Router();
const { requireAdmin } = require("../middleware/auth");
const { validateToken } = require('../middleware/auth');

const syncUser = require("../middleware/syncUser");
const { getOutflow, createOutflow, updateOutflow, deleteOutflow } = require("../controllers/outflowController");

router.get("/",  requireAdmin, syncUser, getOutflow);
router.post("/", requireAdmin, syncUser, createOutflow);

router.put("/:id", validateToken, syncUser, requireAdmin, updateOutflow);
router.delete("/:id", validateToken, syncUser, requireAdmin, deleteOutflow);


module.exports = router;