const { ManagementClient } = require("auth0");
require("dotenv").config();

let managementClient = null;

function getManagementClient() {
  if (!managementClient) {
    // Validate required environment variables
    if (
      !process.env.AUTH0_DOMAIN ||
      !process.env.AUTH0_MGMT_CLIENT_ID ||
      !process.env.AUTH0_MGMT_CLIENT_SECRET
    ) {
      throw new Error("Auth0 Management API credentials missing.");
    }
    managementClient = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_MGMT_CLIENT_ID,
      clientSecret: process.env.AUTH0_MGMT_CLIENT_SECRET,
    });
  }
  return managementClient;
}

/**
 * Create a user in Auth0 and assign a role.
 * @param {Object} params - { email, password, name, roleId }
 * @returns {Promise<string>} Auth0 user ID
 */
async function createAuth0User({ email, password, name, roleId }) {
  const client = getManagementClient();

  // Create user
  const user = await client.users.create({
    connection:
      process.env.AUTH0_CONNECTION || "Username-Password-Authentication",
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

module.exports = { createAuth0User };
