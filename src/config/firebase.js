const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Firebase Admin is used only to verify the ID tokens the client sends.
// Credentials come from one of:
//   FIREBASE_SERVICE_ACCOUNT       - the service-account JSON, base64-encoded (use this on Vercel)
//   FIREBASE_SERVICE_ACCOUNT_PATH  - a path to the JSON file (handy for local development)
function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8"));
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const file = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return null;
}

let auth = null;

function getAuth() {
  if (auth) return auth;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  auth = admin.auth();
  return auth;
}

module.exports = { getAuth };
