const { collections } = require("../config/db");
const { handle } = require("../utils/http");

const { users } = collections;

// Save the logged-in user the first time they sign in. Identity comes from
// the token; new users always start with the "user" role.
const saveUser = handle("Error saving user", async (req, res) => {
  const email = req.user.email;
  if (await users.findOne({ email })) {
    return res.send({ message: "User already exists", insertedId: null });
  }
  const { name, photoURL } = req.body;
  const result = await users.insertOne({
    name: name || req.user.name || null,
    email,
    photoURL: photoURL || req.user.picture || null,
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
