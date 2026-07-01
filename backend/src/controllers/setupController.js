const { pool } = require("../config/db");
const { createAuth0User } = require("../services/auth0ManagementService");
require("dotenv").config();

async function setupAdmin(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Name, email, and password are all required.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters.",
    });
  }

  try {
    // Create user in Auth0 with admin role
    const auth0Id = await createAuth0User({
      email,
      password,
      name,
      roleId: process.env.AUTH0_ADMIN_ROLE_ID,
    });

    // Create user in local DB
    await pool.query(
      `INSERT INTO users (auth0_id, name, email, role)
       VALUES ($1, $2, $3, 'admin')`,
      [auth0Id, name, email],
    );

    return res.status(201).json({
      message: "Admin account created. You can now log in.",
    });
  } catch (err) {
    console.error("Setup error:", err.message);

    if (err.message?.includes("already exists")) {
      return res.status(409).json({
        error: "An account with this email already exists in Auth0.",
      });
    }

    return res.status(500).json({ error: "Setup failed. Please try again." });
  }
}

async function checkSetupRequired(req, res) {
  try {
    const result = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`,
    );
    res.json({ setup_required: result.rows.length === 0 });
  } catch (err) {
    res.status(500).json({ error: "Check failed." });
  }
}

module.exports = { setupAdmin, checkSetupRequired };