require("dotenv").config();
const cors = require("cors");
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use(require("./src/routes/stats"));
app.use(require("./src/routes/movies"));
app.use(require("./src/routes/reviews"));
app.use(require("./src/routes/watchlist"));
app.use(require("./src/routes/users"));

// Unknown routes
app.use((req, res) => {
  res.status(404).send({ message: "Route not found" });
});

app.listen(port, () => {
  console.log(`Movie Matrix Server is running on port ${port}`);
});

module.exports = app;
