const { ObjectId } = require("mongodb");

// Wraps an async route handler so any thrown error becomes a 500 response
// with a readable message, instead of an unhandled promise rejection.
function handle(label, fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error(`${label}:`, error);
      res.status(500).send({ message: label, error: error.message });
    }
  };
}

// Returns an ObjectId for a valid 24-char hex id, otherwise null.
function toObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === String(id) ? new ObjectId(id) : null;
}

module.exports = { handle, toObjectId };
