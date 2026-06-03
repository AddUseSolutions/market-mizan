const multer = require("multer");

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
  cb(null, true);
}

const uploadListingImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 800 * 1024, files: 6 }
});

function filesToDataUrls(files) {
  return (files || []).map((f) => {
    const b64 = f.buffer.toString("base64");
    const mime = f.mimetype || "image/jpeg";
    return `data:${mime};base64,${b64}`;
  });
}

module.exports = { uploadListingImages, filesToDataUrls };
