const { pool } = require("../config/db");
const { logger } = require("../middleware/errorHandler");
const {
  recalculateAllPotentialTiers,
  recalculateAllActiveTiers,
} = require("../services/tierService");

// Potential Tiers (based on frequency)
async function createPotentialTier(req, res) {
  const { tier_number } = req.body;
  const min_frequency = Number(req.body.min_frequency);
  const max_frequency = Number(req.body.max_frequency);

  if (!tier_number || isNaN(min_frequency) || isNaN(max_frequency)) {
    return res.status(400).json({ error: "All fields required." });
  }
  if (min_frequency >= max_frequency) {
    return res
      .status(400)
      .json({ error: "min_frequency must be less than max_frequency." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tiers_potential (tier_number, min_frequency, max_frequency)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tier_number, min_frequency, max_frequency],
    );
    // Recalculate all potential tiers after adding a new tier
    await recalculateAllPotentialTiers();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Tier number already exists." });
    }
    logger.error("createPotentialTier error:", err.message);
    res.status(500).json({ error: "Failed to create tier." });
  }
}

// Active Letter Tiers (based on purchase count)
async function createActiveTier(req, res) {
  const { tier_letter } = req.body;
  const min_purchases = Number(req.body.min_purchases);
  const max_purchases = Number(req.body.max_purchases);

  if (!tier_letter || isNaN(min_purchases) || isNaN(max_purchases)) {
    return res.status(400).json({ error: "All fields required." });
  }
  if (min_purchases >= max_purchases) {
    return res
      .status(400)
      .json({ error: "min_purchases must be less than max_purchases." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tiers_active (tier_letter, min_purchases, max_purchases)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [tier_letter, min_purchases, max_purchases],
    );
    // Recalculate active tiers for all customers (new tier may affect them)
    await recalculateAllActiveTiers();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Tier letter already exists." });
    }
    logger.error("createActiveTier error:", err.message);
    res.status(500).json({ error: "Failed to create tier." });
  }
}

// Active Sub‑Tiers (based on spend ranges)
async function createActiveSubTier(req, res) {
  const { sub_number } = req.body;
  const min_spend = Number(req.body.min_spend);
  const max_spend = Number(req.body.max_spend);

  if (!sub_number || isNaN(min_spend) || isNaN(max_spend)) {
    return res.status(400).json({ error: "All fields required." });
  }
  if (min_spend >= max_spend) {
    return res
      .status(400)
      .json({ error: "min_spend must be less than max_spend." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tiers_active_sub (sub_number, min_spend, max_spend)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [sub_number, min_spend, max_spend],
    );
    // Recalculate active sub‑tiers for all customers
    await recalculateAllActiveTiers();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Sub-tier number already exists." });
    }
    logger.error("createActiveSubTier error:", err.message);
    res.status(500).json({ error: "Failed to create sub-tier." });
  }
}


// GET all tier definitions
async function getTiers(req, res) {
  try {
    const [potential, active, active_sub] = await Promise.all([
      pool.query(`SELECT * FROM tiers_potential ORDER BY tier_number ASC`),
      pool.query(`SELECT * FROM tiers_active ORDER BY tier_letter ASC`),
      pool.query(`SELECT * FROM tiers_active_sub ORDER BY sub_number ASC`),
    ]);

    res.json({
      potential: potential.rows,
      active: active.rows,
      active_sub: active_sub.rows,
    });
  } catch (err) {
    logger.error("getTiers error:", err.message);
    res.status(500).json({ error: "Failed to fetch tier configuration." });
  }
}


// UPDATE all tier thresholds (batch update from admin)
async function updateTiers(req, res) {
  const { potential, active, active_sub } = req.body;

  if (!potential || !active || !active_sub) {
    return res
      .status(400)
      .json({ error: "All tier configurations are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '30s'");

    // Update potential tiers
    for (const tier of potential) {
      if (tier.min_frequency >= tier.max_frequency) {
        throw new Error(`Tier ${tier.tier_number}: min must be less than max.`);
      }
      await client.query(
        `UPDATE tiers_potential
         SET min_frequency = $1, max_frequency = $2
         WHERE id = $3`,
        [tier.min_frequency, tier.max_frequency, tier.id],
      );
    }

    // Update active letter tiers
    for (const tier of active) {
      if (tier.min_purchases >= tier.max_purchases) {
        throw new Error(`Tier ${tier.tier_letter}: min must be less than max.`);
      }
      await client.query(
        `UPDATE tiers_active
         SET min_purchases = $1, max_purchases = $2
         WHERE id = $3`,
        [tier.min_purchases, tier.max_purchases, tier.id],
      );
    }

    // Update sub-tiers
    for (const tier of active_sub) {
      if (tier.min_spend >= tier.max_spend) {
        throw new Error(
          `Sub-tier ${tier.sub_number}: min must be less than max.`,
        );
      }
      await client.query(
        `UPDATE tiers_active_sub
         SET min_spend = $1, max_spend = $2
         WHERE id = $3`,
        [tier.min_spend, tier.max_spend, tier.id],
      );
    }

    await client.query("COMMIT");

    // Recalculate all potential tiers (frequency thresholds changed)
    await recalculateAllPotentialTiers();

    // Recalculate all active tiers (purchase/spend thresholds changed)
    await recalculateAllActiveTiers();

    res.json({ message: "Tier configuration updated." });
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(`updateTiers error: ${err.message}`);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getTiers,
  updateTiers,
  createActiveTier,
  createActiveSubTier,
  createPotentialTier,
};
