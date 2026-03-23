const { ManagementClient } = require('auth0');
require('dotenv').config();

let managementClient = null;

function getManagementClient() {
  if (!managementClient) {
    managementClient = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_MGMT_CLIENT_ID,
      clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET,
    });
  }
  return managementClient;
}

// ------------------------------------
// Create a user in Auth0 and assign
// them a role
// ------------------------------------
async function createAuth0User({ email, password, name, roleId }) {
  const client = getManagementClient();

  // Create the user
  const user = await client.users.create({
    connection: process.env.AUTH0_CONNECTION,
    email,
    password,
    name,
    email_verified: true,
  });

  const userId = user.data.user_id;

  // Assign role
  await client.users.assignRoles(
    { id: userId },
    { roles: [roleId] }
  );

  return userId;
}

module.exports = { createAuth0User };