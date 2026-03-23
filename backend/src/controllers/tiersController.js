const { pool } = require("../config/db");
const { recalculateAllPotentialTiers } = require("../services/tierService");

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
    console.error("getTiers error:", err.message);
    res.status(500).json({ error: "Failed to fetch tier configuration." });
  }
}

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

    // Recalculate all potential tiers after threshold change
    // (full recalculation needed since thresholds affect all contacts)
    await recalculateAllPotentialTiers();

    res.json({ message: "Tier configuration updated." });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("updateTiers error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    try {
      client.release(true);
    } catch (_) {}
  }
}

module.exports = { getTiers, updateTiers };
