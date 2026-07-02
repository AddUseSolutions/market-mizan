function errorHandler(err, req, res, next) {
  console.error("API Fehler:", err);

  let message = err.message || "Interner Serverfehler";
  let status = err.status || 500;

  if (err.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "One or more photos are too large. Each image must be 5 MB or smaller.";
  } else if (err.code === "LIMIT_FILE_COUNT") {
    status = 413;
    message = "Too many photos. You can upload up to 6 images.";
  } else if (err.message === "File too large") {
    status = 413;
    message = "One or more photos are too large. Each image must be 5 MB or smaller.";
  }

  res.status(status).json({ message });
}

module.exports = errorHandler;
