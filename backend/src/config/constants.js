// ------------------------------------
// Shared application constants
//
// Centralising these here means a single
// change propagates everywhere they are
// used, rather than hunting for magic
// strings across multiple files.
// ------------------------------------

// Auth0 custom claim namespace for roles.
// Must match the namespace used in the
// Auth0 Action that injects roles into
// the JWT token.
const ROLES_CLAIM = 'https://betting-tips-api/roles';

module.exports = { ROLES_CLAIM };
