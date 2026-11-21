// Email/password accounts created on or after this moment must verify their
// email before they can use the API. Older accounts are grandfathered.
// Keep in sync with the client's src/config/auth.js.
const VERIFICATION_REQUIRED_SINCE = new Date("2026-11-21T00:00:00Z");

module.exports = { VERIFICATION_REQUIRED_SINCE };
