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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    // Database and Collections
    const database = client.db("movieMatrixDB");
    const moviesCollection = database.collection("movies");
    const usersCollection = database.collection("users");
    const watchlistCollection = database.collection("watchlist");
    const reviewsCollection = database.collection("reviews");

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

    // Get Single Movie by ID (with reviews and average rating)
    app.get("/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const movie = await moviesCollection.findOne(query);

        if (!movie) {
          return res.status(404).send({ message: "Movie not found" });
        }

        // Get all reviews for this movie
        const reviews = await reviewsCollection
          .find({ movieId: id, moderated: true }) // Only show approved reviews
          .sort({ createdAt: -1 })
          .toArray();

        // Calculate average rating from reviews
        let averageRating = movie.rating; // Default to original rating
        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          averageRating = (totalRating / reviews.length).toFixed(1);
        }

        res.send({
          ...movie,
          reviews,
          averageRating: parseFloat(averageRating),
          reviewCount: reviews.length,
        });
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

        // Also delete all reviews for this movie
        await reviewsCollection.deleteMany({ movieId: id });

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

    // ==================== REVIEWS ROUTES ====================

    // Get Reviews for a Movie
    app.get("/reviews/:movieId", async (req, res) => {
      try {
        const movieId = req.params.movieId;

        // Only return approved/moderated reviews
        const reviews = await reviewsCollection
          .find({ movieId, moderated: true })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(reviews);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send({ message: "Error fetching reviews", error: error.message });
      }
    });

    // Get User's Reviews
    app.get("/my-reviews", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }

        const reviews = await reviewsCollection.find({ userEmail: email }).sort({ createdAt: -1 }).toArray();

        res.send(reviews);
      } catch (error) {
        console.error("Error fetching user reviews:", error);
        res.status(500).send({ message: "Error fetching user reviews", error: error.message });
      }
    });

    // Add Review
    app.post("/reviews", async (req, res) => {
      try {
        const { movieId, rating, comment, userEmail, userName, userPhoto } = req.body;

        // Validation
        if (!movieId || !rating || !userEmail) {
          return res.status(400).send({
            message: "Movie ID, rating, and user email are required",
          });
        }

        if (rating < 1 || rating > 10) {
          return res.status(400).send({
            message: "Rating must be between 1 and 10",
          });
        }

        // Check if user already reviewed this movie
        const existingReview = await reviewsCollection.findOne({
          movieId,
          userEmail,
        });

        if (existingReview) {
          return res.status(409).send({
            message: "You have already reviewed this movie",
          });
        }

        // Create review
        const review = {
          movieId,
          rating: parseFloat(rating),
          comment: comment || "",
          userEmail,
          userName: userName || "Anonymous",
          userPhoto: userPhoto || null,
          createdAt: new Date(),
          moderated: true, // Auto-approve for now (can add manual moderation later)
        };

        const result = await reviewsCollection.insertOne(review);

        // Update movie's average rating
        const allReviews = await reviewsCollection.find({ movieId, moderated: true }).toArray();

        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await moviesCollection.updateOne(
          { _id: new ObjectId(movieId) },
          {
            $set: {
              rating: parseFloat(avgRating.toFixed(1)),
              reviewCount: allReviews.length,
            },
          }
        );

        res.status(201).send({
          message: "Review added successfully",
          review: { ...review, _id: result.insertedId },
        });
      } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).send({ message: "Error adding review", error: error.message });
      }
    });

    // Update Review
    app.put("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { rating, comment, userEmail } = req.body;

        // Get existing review
        const review = await reviewsCollection.findOne({ _id: new ObjectId(id) });

        if (!review) {
          return res.status(404).send({ message: "Review not found" });
        }

        // Check if user is the owner of the review
        if (review.userEmail !== userEmail) {
          return res.status(403).send({
            message: "You can only update your own reviews",
          });
        }

        // Validation
        if (rating && (rating < 1 || rating > 10)) {
          return res.status(400).send({
            message: "Rating must be between 1 and 10",
          });
        }

        // Update review
        const updateDoc = {
          $set: {
            rating: rating ? parseFloat(rating) : review.rating,
            comment: comment !== undefined ? comment : review.comment,
            updatedAt: new Date(),
          },
        };

        const result = await reviewsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);

        // Recalculate movie's average rating
        const allReviews = await reviewsCollection
          .find({ movieId: review.movieId, moderated: true })
          .toArray();

        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        await moviesCollection.updateOne(
          { _id: new ObjectId(review.movieId) },
          {
            $set: {
              rating: parseFloat(avgRating.toFixed(1)),
              reviewCount: allReviews.length,
            },
          }
        );

        res.send({ message: "Review updated successfully", result });
      } catch (error) {
        console.error("Error updating review:", error);
        res.status(500).send({ message: "Error updating review", error: error.message });
      }
    });

    // Delete Review
    app.delete("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const userEmail = req.query.email;

        if (!userEmail) {
          return res.status(400).send({ message: "User email is required" });
        }

        // Get existing review
        const review = await reviewsCollection.findOne({ _id: new ObjectId(id) });

        if (!review) {
          return res.status(404).send({ message: "Review not found" });
        }

        // Check if user is the owner of the review
        if (review.userEmail !== userEmail) {
          return res.status(403).send({
            message: "You can only delete your own reviews",
          });
        }

        // Delete review
        const result = await reviewsCollection.deleteOne({ _id: new ObjectId(id) });

        // Recalculate movie's average rating
        const allReviews = await reviewsCollection
          .find({ movieId: review.movieId, moderated: true })
          .toArray();

        let avgRating = 0;
        if (allReviews.length > 0) {
          avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        }

        await moviesCollection.updateOne(
          { _id: new ObjectId(review.movieId) },
          {
            $set: {
              rating: parseFloat(avgRating.toFixed(1)),
              reviewCount: allReviews.length,
            },
          }
        );

        res.send({ message: "Review deleted successfully", result });
      } catch (error) {
        console.error("Error deleting review:", error);
        res.status(500).send({ message: "Error deleting review", error: error.message });
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

    // Get Total Reviews Count
    app.get("/stats/reviews-count", async (req, res) => {
      try {
        const count = await reviewsCollection.countDocuments({ moderated: true });
        res.send({ totalReviews: count });
      } catch (error) {
        console.error("Error fetching review count:", error);
        res.status(500).send({ message: "Error fetching review count", error: error.message });
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
          return res.send([]);
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
          movieId: movieId.toString(),
        });

        if (existing) {
          return res.status(409).send({
            message: "Movie already in watchlist",
          });
        }

        // Add to watchlist
        const result = await watchlistCollection.insertOne({
          email,
          movieId: movieId.toString(),
          addedAt: new Date(),
        });

        console.log("Movie added to watchlist:", email, movieId);
        res.status(201).send({
          message: "Added to watchlist",
          result,
        });
      } catch (error) {
        console.error(" Error adding to watchlist:", error);
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
          movieId: movieId.toString(),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: "Movie not found in watchlist",
          });
        }

        console.log(" Movie removed from watchlist:", email, movieId);
        res.send({
          message: "Removed from watchlist",
          result,
        });
      } catch (error) {
        console.error("Error removing from watchlist:", error);
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
  } catch (error) {
    console.error(" MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Start Server
app.listen(port, () => {
  console.log(`Movie Matrix Server is running on port ${port}`);
});
