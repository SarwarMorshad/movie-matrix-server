const { collections } = require("../config/db");
const { handle } = require("../utils/http");

const { users } = collections;

const MAX_NAME_LENGTH = 60;

// Empty -> null; otherwise must be an http(s) URL of sensible length
const cleanPhotoUrl = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return { value: null };
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || text.length > 500) throw new Error();
    return { value: text };
  } catch {
    return { error: "Photo URL must be a link starting with http:// or https://" };
  }
};

// Trimmed name, or an error if it's too long (empty is allowed: "" means "not set")
const cleanName = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > MAX_NAME_LENGTH) return { error: `Name can be at most ${MAX_NAME_LENGTH} characters` };
  return { value: text };
};

// Save the logged-in user the first time they sign in. Identity comes from
// the token; new users always start with the "user" role and the free plan.
const saveUser = handle("Error saving user", async (req, res) => {
  const email = req.user.email;
  if (await users.findOne({ email })) {
    return res.send({ message: "User already exists", insertedId: null });
  }

  const name = cleanName(req.body.name);
  if (name.error) return res.status(400).send({ message: name.error });
  const photo = cleanPhotoUrl(req.body.photoURL);
  if (photo.error) return res.status(400).send({ message: photo.error });

  const result = await users.insertOne({
    name: name.value || req.user.name || null,
    email,
    photoURL: photo.value || req.user.picture || null,
    role: "user",
    plan: "free",
    createdAt: new Date(),
  });
  res.status(201).send(result);
});

// The logged-in user's own record, including their role and plan
const getMe = handle("Error fetching user", async (req, res) => {
  const user = await users.findOne({ email: req.user.email });
  res.send({
    ...(user || { email: req.user.email, name: req.user.name }),
    plan: user?.plan || "free",
    role: req.user.role,
  });
});

// Update the logged-in user's name and/or photo (only the fields sent)
const updateMe = handle("Error updating profile", async (req, res) => {
  const changes = {};
  if ("name" in req.body) {
    const name = cleanName(req.body.name);
    if (name.error) return res.status(400).send({ message: name.error });
    if (!name.value) return res.status(400).send({ message: "Name can't be empty" });
    changes.name = name.value;
  }
  if ("photoURL" in req.body) {
    const photo = cleanPhotoUrl(req.body.photoURL);
    if (photo.error) return res.status(400).send({ message: photo.error });
    changes.photoURL = photo.value;
  }
  if (!Object.keys(changes).length) return res.status(400).send({ message: "Nothing to update" });

  const user = await users.findOneAndUpdate(
    { email: req.user.email },
    { $set: { ...changes, updatedAt: new Date() }, $setOnInsert: { role: "user", plan: "free", createdAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  res.send({ ...user, plan: user.plan || "free", role: req.user.role });
});

module.exports = { saveUser, getMe, updateMe };
