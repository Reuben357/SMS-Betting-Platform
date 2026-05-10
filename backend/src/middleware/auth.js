// Auth0 JWT validation + role-based access guards.
// Usage:
//   router.get("/summary", requireAdmin, getAccountingSummary);
//   router.get("/tips",    requireAnyUser, getTips);

const { auth, claimCheck } = require("express-oauth2-jwt-bearer");
require("dotenv").config();

// Use a consistent namespace for custom claims (must match Auth0 Action)
const NAMESPACE = "https://betting-tips-api";
const ROLES_CLAIM = `${NAMESPACE}/roles`;

const { logger } = require("./errorHandler");

// JWT validation middleware
const validateToken = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  tokenSigningAlg: "RS256",
});

// Factory to check if a required role exists in the token
function requireRole(role) {
  return claimCheck((payload) => {
    const roles = payload[ROLES_CLAIM] ?? [];
    return roles.includes(role);
  }, `Requires role: ${role}`);
}

// Middleware to log sensitive access for auditing
function logSensitiveAccess(routeName) {
  return (req, res, next) => {
    const user = req.auth?.payload?.sub ?? "unknown";
    logger.info(`Sensitive access: ${routeName} by ${user}`);
    next();
  };
}

// Composed guards for routes
const requireAdmin = [validateToken, requireRole("admin")];
const requireStaff = [validateToken, requireRole("staff")];
const requireAnyUser = [validateToken];

module.exports = {
  validateToken,
  requireAdmin,
  requireStaff,
  requireAnyUser,
  logSensitiveAccess,
};
