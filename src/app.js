const cors = require("cors");
const express = require("express");
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

// Unknown routes
app.use((req, res) => {
  res.status(404).send({ message: "Route not found" });
});

module.exports = app;
