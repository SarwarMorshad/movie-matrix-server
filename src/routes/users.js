const express = require("express");
const { collections } = require("../config/db");
const { handle } = require("../utils/http");

const router = express.Router();
const { users } = collections;

// Save a user the first time they sign in
router.post(
  "/users",
  handle("Error saving user", async (req, res) => {
    const user = req.body;
    if (await users.findOne({ email: user.email })) {
      return res.send({ message: "User already exists", insertedId: null });
    }
    res.status(201).send(await users.insertOne(user));
  })
);

module.exports = router;
