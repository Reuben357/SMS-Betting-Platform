const { auth, claimCheck } = require("express-oauth2-jwt-bearer");
require("dotenv").config();
const { ROLES_CLAIM } = require("../config/constants");

// JWT validation middleware
const validateToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: "RS256",
});

// Role check factory
function requireRole(role) {
  return claimCheck((payload) => {
    const roles = payload[ROLES_CLAIM] ?? [];
    return roles.includes(role);
  }, `Requires role: ${role}`);
}

// Composed role guards
const requireAdmin = [validateToken, requireRole("admin")];
const requireStaff = [validateToken, requireRole("staff")];
const requireAnyUser = [validateToken];

module.exports = { validateToken, requireAdmin, requireStaff, requireAnyUser };
