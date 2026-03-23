const ROLES_CLAIM = "https://betting-tips-api/roles";

// Get the user's role from the session returns 'admin', 'staff', or null
export function getUserRole(user) {
  if (!user) return null;
  const roles = user[ROLES_CLAIM] ?? [];
  if (roles.includes("admin")) return "admin";
  if (roles.includes("staff")) return "staff";
  return null;
}

export function isAdmin(user) {
  return getUserRole(user) === "admin";
}
