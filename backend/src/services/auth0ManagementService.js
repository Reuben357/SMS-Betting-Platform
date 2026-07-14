require('dotenv').config();
const { ManagementClient } = require('auth0');
const { readSecret } = require('../config/secrets');

let managementClient = null;

async function createAuth0User({ email, password, name, roleId }) {
  const client = getManagementClient();

  // Create user
  const user = await client.users.create({
    connection:
        process.env.AUTH0_CONNECTION || 'Username-Password-Authentication',
    email,
    password,
    name,
    email_verified: true,
  });

  const userId = user.data.user_id;

  // Assign role
  await client.users.assignRoles({ id: userId }, { roles: [roleId] });

  return userId;
}

function getManagementClient() {
  if (!managementClient) {
    const missing = [];
    if (!process.env.AUTH0_DOMAIN) missing.push('AUTH0_DOMAIN');
    if (!process.env.AUTH0_MGMT_CLIENT_ID) missing.push('AUTH0_MGMT_CLIENT_ID');

    const clientSecret = readSecret(
        'AUTH0_MGMT_CLIENT_SECRET_FILE',
        'AUTH0_MGMT_CLIENT_SECRET'
    );
    if (!clientSecret) missing.push('AUTH0_MGMT_CLIENT_SECRET');

    if (missing.length > 0) {
      throw new Error(`Auth0 Management API credentials missing: ${missing.join(', ')}`);
    }

    managementClient = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_MGMT_CLIENT_ID,
      clientSecret,
    });
  }
  return managementClient;
}

module.exports = { createAuth0User };