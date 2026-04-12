function errorHandler(err, req, res, next) {
  // Zentrale Fehlerbehandlung für API-Antworten.
  console.error("API Fehler:", err);
  res.status(err.status || 500).json({
    message: err.message || "Interner Serverfehler"
  });
}

module.exports = errorHandler;
