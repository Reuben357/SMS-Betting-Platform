const { pool } = require("../config/db");

// ------------------------------------
// Get potential tier for a frequency count
//
// Used for single-contact lookups.
// For bulk operations use
// recalculatePotentialTiersForContacts().
// ------------------------------------
async function getPotentialTier(frequencyCount) {
  const result = await pool.query(
    `SELECT tier_number
     FROM tiers_potential
     WHERE $1 >= min_frequency AND $1 <= max_frequency
     LIMIT 1`,
    [frequencyCount],
  );
  return result.rows[0]?.tier_number ?? null;
}

// ------------------------------------
// Get active tier letter for a purchase count
// ------------------------------------
async function getActiveTierLetter(totalPurchases) {
  const result = await pool.query(
    `SELECT tier_letter
     FROM tiers_active
     WHERE $1 >= min_purchases AND $1 <= max_purchases
     LIMIT 1`,
    [totalPurchases],
  );
  return result.rows[0]?.tier_letter ?? null;
}

// ------------------------------------
// Get active sub-tier for a customer
//
// Determined by the spend range in which
// the customer has made the most purchases.
// Ties are broken by the higher sub-tier number.
// ------------------------------------
async function getActiveSubTier(phoneNumber) {
  const result = await pool.query(
    `SELECT
       ts.sub_number,
       COUNT(pu.id) AS purchase_count
     FROM tiers_active_sub ts
     LEFT JOIN purchases pu
       ON pu.phone_number = $1
       AND pu.amount_paid >= ts.min_spend
       AND pu.amount_paid <= ts.max_spend
     GROUP BY ts.sub_number, ts.min_spend, ts.max_spend
     ORDER BY
       COUNT(pu.id) DESC,
       ts.sub_number DESC
     LIMIT 1`,
    [phoneNumber],
  );
  return result.rows[0]?.sub_number ?? null;
}

// ------------------------------------
// Recalculate potential tiers for a
// specific set of phone numbers
//
// Called after every CSV upload with
// only the phone numbers from that upload.
// This is O(upload size) not O(table size).
//
// The correlated subquery finds the matching
// tier threshold row for each contact and
// assigns it — entirely in the database,
// no data is fetched to the application layer.
// ------------------------------------
async function recalculatePotentialTiersForContacts(phoneNumbers) {
  if (!phoneNumbers || phoneNumbers.length === 0) return;

  await pool.query(
    `UPDATE contacts c
     SET potential_tier = (
       SELECT tp.tier_number
       FROM tiers_potential tp
       WHERE c.frequency_count >= tp.min_frequency
         AND c.frequency_count <= tp.max_frequency
       LIMIT 1
     )
     WHERE c.phone_number = ANY($1)`,
    [phoneNumbers],
  );
}

// ------------------------------------
// Recalculate potential tiers for ALL
// contacts in the table
//
// Used when tier thresholds are changed
// by Admin in the dashboard — a threshold
// change affects every contact, so a full
// recalculation is necessary in that case.
// ------------------------------------
async function recalculateAllPotentialTiers() {
  await pool.query(
    `UPDATE contacts c
     SET potential_tier = (
       SELECT tp.tier_number
       FROM tiers_potential tp
       WHERE c.frequency_count >= tp.min_frequency
         AND c.frequency_count <= tp.max_frequency
       LIMIT 1
     )`,
  );
}

module.exports = {
  getPotentialTier,
  getActiveTierLetter,
  getActiveSubTier,
  recalculatePotentialTiersForContacts,
  recalculateAllPotentialTiers,
};
