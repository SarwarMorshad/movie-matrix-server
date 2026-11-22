const { getAuth } = require("../config/firebase");
const { collections } = require("../config/db");
const { VERIFICATION_REQUIRED_SINCE } = require("../config/auth");

// Email/password accounts must have verified their email, unless they were
// created before VERIFICATION_REQUIRED_SINCE. Google and other providers
// already verify emails themselves.
async function hasVerifiedEmail(auth, decoded) {
  if (decoded.firebase?.sign_in_provider !== "password" || decoded.email_verified) return true;
  const record = await auth.getUser(decoded.uid); // only for unverified password accounts
  return new Date(record.metadata.creationTime) < VERIFICATION_REQUIRED_SINCE;
}

// Requires a valid Firebase ID token in "Authorization: Bearer <token>" from
// an account with a verified email. On success sets
// req.user = { uid, email, name, picture, role }.
const verifyToken = (req, res, next) => checkToken(req, res, next, { allowUnverified: false });

// Same, but also lets through email/password accounts that haven't verified
// yet. Only for saving the profile right after sign-up.
const verifyTokenAllowUnverified = (req, res, next) => checkToken(req, res, next, { allowUnverified: true });

async function checkToken(req, res, next, { allowUnverified }) {
  const auth = getAuth();
  if (!auth) {
    console.error("Firebase Admin is not configured: set FIREBASE_SERVICE_ACCOUNT");
    return res.status(500).send({ message: "Authentication is not configured on the server" });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  // `code` lets the client tell "not logged in" apart from "token rejected"
  if (!token) return res.status(401).send({ code: "TOKEN_MISSING", message: "Please log in to continue" });

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (error) {
    return res
      .status(401)
      .send({ code: "TOKEN_INVALID", message: "Your session has expired, please log in again" });
  }

  try {
    if (!allowUnverified && !(await hasVerifiedEmail(auth, decoded))) {
      return res
        .status(403)
        .send({ code: "EMAIL_NOT_VERIFIED", message: "Please verify your email address to continue" });
    }

    const email = decoded.email?.toLowerCase();
    const dbUser = email ? await collections.users.findOne({ email }) : null;
    req.user = {
      uid: decoded.uid,
      email,
      name: decoded.name || dbUser?.name || null,
      picture: decoded.picture || dbUser?.photoURL || null,
      role: dbUser?.role === "admin" ? "admin" : "user",
    };
    next();
  } catch (error) {
    console.error("Error checking the signed-in user:", error);
    return res.status(500).send({ message: "Couldn't check your account, please try again" });
  }
}

// Use after verifyToken. Only admins get through.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).send({ message: "Admins only" });
  next();
}

const isOwnerOrAdmin = (user, ownerEmail) =>
  user.role === "admin" || (!!ownerEmail && String(ownerEmail).toLowerCase() === user.email);

module.exports = { verifyToken, verifyTokenAllowUnverified, requireAdmin, isOwnerOrAdmin };
