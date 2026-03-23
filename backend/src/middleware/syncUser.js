const { pool } = require('../config/db');

// The namespace must match exactly what is set in the Auth0 Action. All custom claims injected by the Action use this prefix.
const NAMESPACE = 'https://betting-tips-api';
const ROLES_CLAIM = `${NAMESPACE}/roles`;

// User sync middleware
async function syncUser(req, res, next) {
  try {
    const payload = req.auth.payload;

    // sub is the Auth0 user ID — stable and unique across all login methods (Google, email, etc.)
    const auth0Id = payload.sub;

    // Role from the custom namespace claim injected by the Auth0 Action.
    // Defaults to 'staff' if no roles are present — safe lower privilege.
    const roles = payload[ROLES_CLAIM] ?? [];
    const role = roles.includes('admin') ? 'admin' : 'staff';

    // Email and name are injected by the Auth0 Action into the access token
    // under the custom namespace. Fall back to standard claims for
    // compatibility with tokens issued before the Action was updated.
    const email =
      payload[`${NAMESPACE}/email`] ??
      payload.email ??
      null;

    const name =
      payload[`${NAMESPACE}/name`] ??
      payload.name ??
      payload.given_name ??
      payload.nickname ??
      null;

    // Used INSERT ... ON CONFLICT to upsert by auth0_id.
    // Email is only written on first insert — never updated after that
    // to avoid unique constraint conflicts if the same email appears
    // on another record from a previous session.
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
      [auth0Id, name, email, role]
    );

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('User sync error:', err.message);
    res.status(500).json({ error: 'Authentication error.' });
  }
}

module.exports = syncUser;