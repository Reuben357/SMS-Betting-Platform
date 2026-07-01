const express = require("express");
const router = express.Router();
const { requireAdmin, requireStaff, requireAnyUser } = require("../middleware/auth");
const syncUser = require("../middleware/syncUser");
const {
  getTemplates,
  updateTemplates,
  getSubscriptionSettings,
  updateSubscriptionSettings,
  getPaymentConfirmation,
  updatePaymentConfirmation,
    getSmsSoftDeleteInfo,
} = require("../controllers/settingsController");

router.get("/templates", requireAnyUser, syncUser, getTemplates);
router.put("/templates", requireAnyUser, syncUser, updateTemplates);

router.get("/subscription", requireAnyUser ,syncUser, getSubscriptionSettings);
router.put("/subscription", requireAnyUser,syncUser, updateSubscriptionSettings);

router.get('/payment-confirmation', requireAnyUser ,getPaymentConfirmation);
router.put('/payment-confirmation', requireAnyUser ,updatePaymentConfirmation);

router.get('/sms-soft-delete', getSmsSoftDeleteInfo);

module.exports = router;
