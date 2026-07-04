/**
 * Utility functions for validating IP addresses against network ranges (CIDRs)
 */

/**
 * Converts an IPv4 address string (e.g., "192.168.1.1") into a 32-bit integer.
 * This makes it possible to do fast, mathematical range checks.
 */
function ipToInt(ip) {
    return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Checks if a given incoming IP address falls inside a specific CIDR range.
 * Example: isIPv4InCIDR("196.201.214.5", "196.201.214.0/24") -> returns true
 */
function isIPv4InCIDR(ip, cidr) {
    // If the rule is a single IP instead of a range (like "127.0.0.1"), do a direct check
    if (!cidr.includes('/')) {
        return ip === cidr;
    }

    const [range, bits] = cidr.split('/');
    const mask = ~(~(0 >>> 0) >>> parseInt(bits, 10));

    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);

    // Math operation: Do the network bits match?
    return (ipInt & mask) === (rangeInt & mask);
}

module.exports = { isIPv4InCIDR };