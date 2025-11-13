require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.cjj6frc.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");

    // Database and Collections
    const database = client.db("movieMatrixDB");
    const moviesCollection = database.collection("movies");
    const usersCollection = database.collection("users");
    const watchlistCollection = database.collection("watchlist");

    // ==================== ROUTES ====================

    // Health Check
    app.get("/", (req, res) => {
      res.send("🎬 Movie Matrix Server Is Running!");
    });

    // ==================== MOVIE ROUTES ====================

    // Get All Movies
    app.get("/movies", async (req, res) => {
      try {
        const movies = await moviesCollection.find().toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error fetching movies:", error);
        res.status(500).send({ message: "Error fetching movies", error: error.message });
      }
    });

    // Get Single Movie by ID
    app.get("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const movie = await moviesCollection.findOne(query);

        if (!movie) {
          return res.status(404).send({ message: "Movie not found" });
        }

        res.send(movie);
      } catch (error) {
        console.error("Error fetching movie:", error);
        res.status(500).send({ message: "Error fetching movie", error: error.message });
      }
    });

    // Get Movies by User Email (My Collection)
    app.get("/my-movies", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const query = { addedBy: email };
        const movies = await moviesCollection.find(query).toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error fetching user movies:", error);
        res.status(500).send({ message: "Error fetching user movies", error: error.message });
      }
    });

    // Get Top Rated Movies (Top 5)
    app.get("/movies-top-rated", async (req, res) => {
      try {
        const movies = await moviesCollection.find().sort({ rating: -1 }).limit(5).toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error fetching top rated movies:", error);
        res.status(500).send({ message: "Error fetching top rated movies", error: error.message });
      }
    });

    // Get Recently Added Movies (Latest 6)
    app.get("/movies-recent", async (req, res) => {
      try {
        const movies = await moviesCollection.find().sort({ _id: -1 }).limit(6).toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error fetching recent movies:", error);
        res.status(500).send({ message: "Error fetching recent movies", error: error.message });
      }
    });

    // Add New Movie
    app.post("/movies", async (req, res) => {
      try {
        const movie = req.body;

        // Basic validation
        if (!movie.title || !movie.genre || !movie.rating) {
          return res.status(400).send({ message: "Missing required fields" });
        }

        const result = await moviesCollection.insertOne(movie);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding movie:", error);
        res.status(500).send({ message: "Error adding movie", error: error.message });
      }
    });

    // Update Movie
    app.put("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedMovie = req.body;

        const updateDoc = {
          $set: {
            title: updatedMovie.title,
            genre: updatedMovie.genre,
            releaseYear: updatedMovie.releaseYear,
            director: updatedMovie.director,
            cast: updatedMovie.cast,
            rating: updatedMovie.rating,
            duration: updatedMovie.duration,
            plotSummary: updatedMovie.plotSummary,
            posterUrl: updatedMovie.posterUrl,
            language: updatedMovie.language,
            country: updatedMovie.country,
          },
        };

        const result = await moviesCollection.updateOne(filter, updateDoc);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Movie not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error updating movie:", error);
        res.status(500).send({ message: "Error updating movie", error: error.message });
      }
    });

    // Delete Movie
    app.delete("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await moviesCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Movie not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("Error deleting movie:", error);
        res.status(500).send({ message: "Error deleting movie", error: error.message });
      }
    });

    // ==================== STATISTICS ROUTES ====================

    // Get Total Movies Count
    app.get("/stats/movies-count", async (req, res) => {
      try {
        const count = await moviesCollection.countDocuments();
        res.send({ totalMovies: count });
      } catch (error) {
        console.error("Error fetching movie count:", error);
        res.status(500).send({ message: "Error fetching movie count", error: error.message });
      }
    });

    // Get Total Users Count
    app.get("/stats/users-count", async (req, res) => {
      try {
        const count = await usersCollection.countDocuments();
        res.send({ totalUsers: count });
      } catch (error) {
        console.error("Error fetching user count:", error);
        res.status(500).send({ message: "Error fetching user count", error: error.message });
      }
    });

    // ==================== USER ROUTES ====================

    // Save User to Database
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };

        // Check if user already exists
        const existingUser = await usersCollection.findOne(query);

        if (existingUser) {
          return res.send({ message: "User already exists", insertedId: null });
        }

        const result = await usersCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).send({ message: "Error saving user", error: error.message });
      }
    });

    // ==================== WATCHLIST ROUTES ====================

    // Get User's Watchlist
    app.get("/watchlist/:email", async (req, res) => {
      try {
        const email = req.params.email;

        // Get all movie IDs from user's watchlist
        const watchlistItems = await watchlistCollection.find({ email }).toArray();

        if (watchlistItems.length === 0) {
          return res.send([]); // Return empty array if no watchlist items
        }

        // Convert movie IDs to ObjectId
        const movieIds = watchlistItems
          .map((item) => {
            try {
              return new ObjectId(item.movieId);
            } catch (error) {
              console.error("Invalid movieId:", item.movieId);
              return null;
            }
          })
          .filter((id) => id !== null);

        // Get full movie details
        const movies = await moviesCollection.find({ _id: { $in: movieIds } }).toArray();

        res.send(movies);
      } catch (error) {
        console.error("Error fetching watchlist:", error);
        res.status(500).send({
          message: "Error fetching watchlist",
          error: error.message,
        });
      }
    });

    // Add Movie to Watchlist
    app.post("/watchlist", async (req, res) => {
      try {
        const { email, movieId } = req.body;

        // Validate input
        if (!email || !movieId) {
          return res.status(400).send({
            message: "Email and movieId are required",
          });
        }

        // Check if already in watchlist
        const existing = await watchlistCollection.findOne({
          email,
          movieId: movieId.toString(), // Store as string
        });

        if (existing) {
          return res.status(409).send({
            message: "Movie already in watchlist",
          });
        }

        // Add to watchlist
        const result = await watchlistCollection.insertOne({
          email,
          movieId: movieId.toString(), // Store as string
          addedAt: new Date(),
        });

        console.log("✅ Movie added to watchlist:", email, movieId);
        res.status(201).send({
          message: "Added to watchlist",
          result,
        });
      } catch (error) {
        console.error("❌ Error adding to watchlist:", error);
        res.status(500).send({
          message: "Error adding to watchlist",
          error: error.message,
        });
      }
    });

    // Remove Movie from Watchlist
    app.delete("/watchlist/:email/:movieId", async (req, res) => {
      try {
        const { email, movieId } = req.params;

        // Delete from watchlist
        const result = await watchlistCollection.deleteOne({
          email,
          movieId: movieId.toString(), // Search as string
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: "Movie not found in watchlist",
          });
        }

        console.log("✅ Movie removed from watchlist:", email, movieId);
        res.send({
          message: "Removed from watchlist",
          result,
        });
      } catch (error) {
        console.error("❌ Error removing from watchlist:", error);
        res.status(500).send({
          message: "Error removing from watchlist",
          error: error.message,
        });
      }
    });

    // Get Watchlist Count (for stats)
    app.get("/stats/watchlist-count/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const count = await watchlistCollection.countDocuments({ email });
        res.send({ watchlistCount: count });
      } catch (error) {
        console.error("Error fetching watchlist count:", error);
        res.status(500).send({
          message: "Error fetching watchlist count",
          error: error.message,
        });
      }
    });

    // ==================== SEARCH & FILTER ROUTES ====================

    // Search Movies by Title
    app.get("/movies/search/:query", async (req, res) => {
      try {
        const searchQuery = req.params.query;
        const movies = await moviesCollection
          .find({
            title: { $regex: searchQuery, $options: "i" },
          })
          .toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error searching movies:", error);
        res.status(500).send({ message: "Error searching movies", error: error.message });
      }
    });

    // Filter Movies by Genre
    app.get("/movies/genre/:genre", async (req, res) => {
      try {
        const genre = req.params.genre;
        const movies = await moviesCollection.find({ genre: { $regex: genre, $options: "i" } }).toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error filtering movies by genre:", error);
        res.status(500).send({ message: "Error filtering movies", error: error.message });
      }
    });

    // ==================== ADVANCED FILTERING ROUTES ====================

    // Filter Movies by Multiple Genres (using $in operator)
    app.post("/movies/filter/genres", async (req, res) => {
      try {
        const { genres } = req.body;

        if (!genres || genres.length === 0) {
          return res.status(400).send({ message: "Genres array is required" });
        }

        // Use MongoDB $in operator for multiple genres
        const movies = await moviesCollection
          .find({
            genre: { $in: genres },
          })
          .toArray();

        res.send(movies);
      } catch (error) {
        console.error("Error filtering by genres:", error);
        res.status(500).send({ message: "Error filtering movies", error: error.message });
      }
    });

    // Filter Movies by Rating Range (using $gte and $lte operators)
    app.get("/movies/filter/rating", async (req, res) => {
      try {
        const minRating = parseFloat(req.query.min) || 0;
        const maxRating = parseFloat(req.query.max) || 10;

        // Use MongoDB $gte and $lte operators
        const movies = await moviesCollection
          .find({
            rating: { $gte: minRating, $lte: maxRating },
          })
          .toArray();

        res.send(movies);
      } catch (error) {
        console.error("Error filtering by rating:", error);
        res.status(500).send({ message: "Error filtering movies", error: error.message });
      }
    });

    // Combined Filter (Genres + Rating Range)
    app.post("/movies/filter/advanced", async (req, res) => {
      try {
        const { genres, minRating, maxRating } = req.body;

        const query = {};

        // Add genre filter if provided (using $in)
        if (genres && genres.length > 0) {
          query.genre = { $in: genres };
        }

        // Add rating filter if provided (using $gte and $lte)
        if (minRating !== undefined || maxRating !== undefined) {
          query.rating = {};
          if (minRating !== undefined) {
            query.rating.$gte = parseFloat(minRating);
          }
          if (maxRating !== undefined) {
            query.rating.$lte = parseFloat(maxRating);
          }
        }

        const movies = await moviesCollection.find(query).toArray();
        res.send(movies);
      } catch (error) {
        console.error("Error with advanced filtering:", error);
        res.status(500).send({ message: "Error filtering movies", error: error.message });
      }
    });

    console.log("✅ All routes are ready!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Start Server
app.listen(port, () => {
  console.log(`🎬 Movie Matrix Server is running on port ${port}`);
});
