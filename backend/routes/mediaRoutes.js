const express = require("express");
const { getMediaVariant, isMediaKey, PUBLIC_VARIANTS } = require("../utils/mediaStore");

const router = express.Router();

router.get("/:key/:variant?", async (req, res, next) => {
  try {
    const { key } = req.params;
    const variant = req.params.variant || "lg";
    if (!isMediaKey(key) || !PUBLIC_VARIANTS.includes(variant)) {
      return res.status(404).json({ message: "Not found" });
    }

    const etag = `"${key}-${variant}"`;
    if (req.headers["if-none-match"] === etag) return res.status(304).end();

    const file = (await getMediaVariant(key, variant)) || (variant !== "lg" ? await getMediaVariant(key, "lg") : null);
    if (!file) return res.status(404).json({ message: "Not found" });

    res.set({
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag
    });
    return res.send(file.data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
