// Shared application constants

// Auth0 custom claim namespace for roles.
// Must match the namespace used in the
// Auth0 Action that injects roles into
// the JWT token.
const ROLES_CLAIM = 'https://betting-tips-api/roles';

// Shared payment sanity bounds — used by BOTH the direct Daraja callback
// (paymentController.js) and the Malipo-forwarded callback
// (malipoController.js), so the two paths can never silently drift apart on
// what counts as a valid transaction.
const MIN_PACKAGE_PRICE = 1;
const MAX_REASONABLE_AMOUNT = 250000;

module.exports = { ROLES_CLAIM, MIN_PACKAGE_PRICE, MAX_REASONABLE_AMOUNT };
