const { getAuth } = require("../config/firebase");
const { collections } = require("../config/db");

// Requires a valid Firebase ID token in "Authorization: Bearer <token>".
// On success sets req.user = { uid, email, name, picture, role }.
async function verifyToken(req, res, next) {
  const auth = getAuth();
  if (!auth) {
    console.error("Firebase Admin is not configured: set FIREBASE_SERVICE_ACCOUNT");
    return res.status(500).send({ message: "Authentication is not configured on the server" });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send({ message: "Please log in to continue" });

  try {
    const decoded = await auth.verifyIdToken(token);
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
    return res.status(401).send({ message: "Your session has expired, please log in again" });
  }
}

// Use after verifyToken. Only admins get through.
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).send({ message: "Admins only" });
  next();
}

// Use after verifyToken on routes with an :email param. Users may only act on
// their own data; admins may act on anyone's.
function sameUserParam(req, res, next) {
  const email = String(req.params.email || "").toLowerCase();
  if (email !== req.user.email && req.user.role !== "admin") {
    return res.status(403).send({ message: "You can only access your own data" });
  }
  next();
}

const isOwnerOrAdmin = (user, ownerEmail) =>
  user.role === "admin" || (!!ownerEmail && String(ownerEmail).toLowerCase() === user.email);

module.exports = { verifyToken, requireAdmin, sameUserParam, isOwnerOrAdmin };
