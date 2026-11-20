const { collections } = require("../config/db");
const { toObjectId } = require("./http");

// Recalculates a movie's rating and review count from its approved reviews.
async function refreshMovieRating(movieId) {
  const _id = toObjectId(movieId);
  if (!_id) return;

  const reviews = await collections.reviews.find({ movieId, moderated: true }).toArray();
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  await collections.movies.updateOne(
    { _id },
    { $set: { rating: parseFloat(avg.toFixed(1)), reviewCount: reviews.length } }
  );
}

module.exports = { refreshMovieRating };
