// Auth0 namespace for custom claims (must match Auth0 Action configuration)
const ROLES_CLAIM = "https://betting-tips-api/roles";

/**
 * Extract the user's role from the Auth0 session.
 * @param {Object} user - The user object from Auth0
 * @returns {"admin"|"staff"|null}
 */
export function getUserRole(user) {
  if (!user) return null;
  const roles = user[ROLES_CLAIM] ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return null;
}

/**
 * Check if the user has admin privileges.
 * @param {Object} user - The user object from Auth0
 * @returns {boolean}
 */
export function isAdmin(user) {
  return getUserRole(user) === "admin";
}
