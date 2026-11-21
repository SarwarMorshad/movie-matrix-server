const { collections } = require("../config/db");
const { toObjectId } = require("./http");

// Recalculates a movie's community rating (average of approved member reviews)
// and review count. The movie's own `rating` is never touched: before, reviews
// overwrote it, and deleting the last review reset it to 0.
async function refreshMovieRating(movieId) {
  const _id = toObjectId(movieId);
  if (!_id) return;

  const reviews = await collections.reviews.find({ movieId, moderated: true }).toArray();
  const communityRating = reviews.length
    ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
    : null;

  await collections.movies.updateOne({ _id }, { $set: { communityRating, reviewCount: reviews.length } });
}

module.exports = { refreshMovieRating };
