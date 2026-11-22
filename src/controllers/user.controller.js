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

// Save the logged-in user the first time they sign in. Identity comes from
// the token; new users always start with the "user" role.
const saveUser = handle("Error saving user", async (req, res) => {
  const email = req.user.email;
  if (await users.findOne({ email })) {
    return res.send({ message: "User already exists", insertedId: null });
  }

  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (name.length > MAX_NAME_LENGTH) {
    return res.status(400).send({ message: `Name can be at most ${MAX_NAME_LENGTH} characters` });
  }
  const photo = cleanPhotoUrl(req.body.photoURL);
  if (photo.error) return res.status(400).send({ message: photo.error });

  const result = await users.insertOne({
    name: name || req.user.name || null,
    email,
    photoURL: photo.value || req.user.picture || null,
    role: "user",
    createdAt: new Date(),
  });
  res.status(201).send(result);
});

// The logged-in user's own record, including their role
const getMe = handle("Error fetching user", async (req, res) => {
  const user = await users.findOne({ email: req.user.email });
  res.send({ ...(user || { email: req.user.email, name: req.user.name }), role: req.user.role });
});

module.exports = { saveUser, getMe };
