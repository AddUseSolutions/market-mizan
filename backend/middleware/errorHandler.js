const { MAX_PHOTO_BYTES, MAX_PHOTOS } = require("./upload");

const TOO_LARGE = `One or more photos are too large. Each image must be ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB or smaller.`;

function errorHandler(err, req, res, next) {
  console.error("API Fehler:", err);

  let message = err.message || "Interner Serverfehler";
  let status = err.status || 500;

  if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = TOO_LARGE;
  } else if (err.code === "LIMIT_FILE_COUNT") {
    status = 413;
    message = `Too many photos. You can upload up to ${MAX_PHOTOS} images.`;
  } else if (err.message === "File too large") {
    status = 413;
    message = TOO_LARGE;
  }

  res.status(status).json({ message });
}

module.exports = errorHandler;
