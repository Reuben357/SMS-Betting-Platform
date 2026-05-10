const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");


/**
 * Get potential tier for a given frequency count (number of SMS received / interactions).
 * Used for lead segmentation.
 * @param {number} frequencyCount - Number of times the contact has been contacted
 * @returns {Promise<number|null>} Tier number or null if no tier matches
 */
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

/**
 * Get active tier letter based on total purchase count.
 * @param {number} totalPurchases - Number of purchases made by the customer
 * @returns {Promise<string|null>} Tier letter (A, B, C, etc.) or null
 */
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


// Get active sub‑tier number based on dominant spend range.
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


// Recalculate potential tiers for a list of contacts (by phone number).
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
    logger.info(
      `Recalculated potential tiers for ${phoneNumbers.length} contacts.`,
    );

}

// Recalculate potential tiers for ALL contacts. Called after admin updates potential tier thresholds.
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
  logger.info("Recalculated potential tiers for all contacts.");
}

// Recalculate active tiers (letter and sub‑tier) for ALL customers. Called after admin updates active tier thresholds.
async function recalculateAllActiveTiers() {
  // Update letter tiers
  await pool.query(`
    UPDATE customers c
    SET tier_letter = (
      SELECT tier_letter
      FROM tiers_active ta
      WHERE c.total_purchases >= ta.min_purchases
        AND c.total_purchases <= ta.max_purchases
      LIMIT 1
    )
    WHERE c.total_purchases > 0
  `);


  // Update sub-tiers based on dominant spend range
  await pool.query(`
    WITH sub_tier_ranking AS (
      SELECT
        pu.phone_number,
        ts.sub_number,
        COUNT(pu.id) AS purchase_count,
        ROW_NUMBER() OVER (
          PARTITION BY pu.phone_number
          ORDER BY COUNT(pu.id) DESC, ts.sub_number DESC
        ) AS rn
      FROM purchases pu
      JOIN tiers_active_sub ts
        ON pu.amount_paid >= ts.min_spend
       AND pu.amount_paid <= ts.max_spend
      GROUP BY pu.phone_number, ts.sub_number
    )
    UPDATE customers c
    SET tier_sub_number = s.sub_number
    FROM sub_tier_ranking s
    WHERE c.phone_number = s.phone_number AND s.rn = 1
  `);

  logger.info("Recalculated active tiers for all customers.");
}

/**
 * Update a customer's active tier (letter and sub‑tier) based on their total purchases
 * and spending distribution.
 * Called after every successful purchase (exact match or auto‑resolved overpayment).
 *
 * @param {string} phoneNumber - Customer's phone number
 */
async function updateActiveTier(phoneNumber) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get total purchases count
    const totalRes = await client.query(
      `SELECT total_purchases FROM customers WHERE phone_number = $1`,
      [phoneNumber],
    );
    const totalPurchases = totalRes.rows[0]?.total_purchases ?? 0;

    // Determine letter tier (if any purchases exist)
    let tierLetter = null;
    if (totalPurchases > 0) {
      tierLetter = await getActiveTierLetter(totalPurchases);
    }

    // Determine sub-tier based on dominant spend range
    let subTier = null;
    if (totalPurchases > 0) {
      subTier = await getActiveSubTier(phoneNumber);
    }

    await client.query(
      `UPDATE customers
       SET tier_letter = $1, tier_sub_number = $2, updated_at = NOW()
       WHERE phone_number = $3`,
      [tierLetter, subTier, phoneNumber],
    );

    await client.query("COMMIT");
    logger.debug(
      `Updated active tier for ${phoneNumber}: letter=${tierLetter}, sub=${subTier}`,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`updateActiveTier error for ${phoneNumber}: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getPotentialTier,
  getActiveTierLetter,
  getActiveSubTier,
  recalculatePotentialTiersForContacts,
  recalculateAllPotentialTiers,
  recalculateAllActiveTiers,
  updateActiveTier,
};
