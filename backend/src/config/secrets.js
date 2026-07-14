const fs = require('fs');

function readSecret(fileEnvVar, plainEnvVar) {
    const filePath = process.env[fileEnvVar];

    if (!filePath) {
        const plainValue = process.env[plainEnvVar];

        if (!plainValue) {
            throw new Error(`Missing secret: neither ${fileEnvVar} nor ${plainEnvVar} is set`);
        }

        return plainValue;
    }

    try {
        return fs.readFileSync(filePath, 'utf8').trim();
    } catch (err) {
        throw new Error(`Failed to read secret from ${fileEnvVar} (${filePath}): ${err.message}`);
    }
}

module.exports = { readSecret };