const { pool } = require("../config/db");
const { logger } = require("./errorHandler");

const NAMESPACE = "https://betting-tips-api";
const ROLES_CLAIM = `${NAMESPACE}/roles`;

// Sync user from Auth0 token to local database
async function syncUser(req, res, next) {
  try {
    // Ensure validateToken middleware ran before
    if (!req.auth || !req.auth.payload) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const payload = req.auth.payload;
    
    const auth0Id = payload.sub;

    // Extract roles (default to ['staff'] if missing)
    const roles = payload[ROLES_CLAIM] ?? [];
    const role = roles.includes("admin") ? "admin" : "staff";

    // Get email and name – first from custom claims, then fallback to standard claims
   let email = payload[`${NAMESPACE}/email`] ?? payload.email ?? null;
    if (!email) {
      email = `${auth0Id}@jengatips.com`;
    }

   let name = payload[`${NAMESPACE}/name`] ?? payload.name ?? payload.given_name ?? payload.nickname;
    if (!name || name === null || name === "null") {
      name = "JengaTips User";
    }

    // Upsert user – email is only set on first insert to avoid conflicts
    const result = await pool.query(
      `INSERT INTO users (auth0_id, name, email, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth0_id) DO UPDATE
         SET role = EXCLUDED.role,
             name = CASE
               WHEN users.name IS NULL OR users.name = users.auth0_id
                 THEN COALESCE(EXCLUDED.name, users.name)
               ELSE users.name
             END
       RETURNING *`,
      [auth0Id, name, email, role],
    );

    req.user = result.rows[0];
    next();
  } catch (err) {
    logger.error(`User sync error: ${err.message}`);
    res.status(500).json({ error: "Authentication error." });
  }
}

module.exports = syncUser;
