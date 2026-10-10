const multer = require("multer");

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_PHOTOS = 6;

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
  cb(null, true);
}

const uploadListingImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_PHOTO_BYTES, files: MAX_PHOTOS }
});

module.exports = { uploadListingImages, MAX_PHOTO_BYTES, MAX_PHOTOS };
