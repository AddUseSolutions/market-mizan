const { postContact } = require("./contactController");
const { getEtbPerUsd, todayIsoDate, etbToUsd } = require("../utils/fxRate");
const { suggestTitles: openAiTitles, suggestDescription } = require("../utils/openaiHelper");

function buildTitleSuggestions(body) {
  const mode = String(body.listingMode || "for_rent").toLowerCase();
  const modeLabel = mode === "for_sale" ? "For sale" : "For rent";
  const area = String(body.locationArea || body.area || "Addis Ababa").trim();
  const beds = body.bedrooms != null ? Number(body.bedrooms) : Number(body.rooms);
  const baths = body.bathrooms != null ? Number(body.bathrooms) : null;
  const type = String(body.propertyType || "property").replace(/_/g, " ");
  const price = Number(body.price || body.priceEtb);
  const etbPerUsd = getEtbPerUsd();
  const pricePart =
    Number.isFinite(price) && price > 0
      ? mode === "for_sale"
        ? `@ ETB ${Math.round(price).toLocaleString("en-US")} (~$${etbToUsd(price, etbPerUsd)?.toLocaleString("en-US")})`
        : `@ ETB ${Math.round(price).toLocaleString("en-US")}/month`
      : "";

  const parts = [
    `${modeLabel} – ${area}`,
    Number.isFinite(beds) && beds > 0 ? `${beds} bedroom${beds === 1 ? "" : "s"}` : null,
    Number.isFinite(baths) && baths > 0 ? `${baths} bath${baths === 1 ? "" : "s"}` : null,
    type,
    pricePart
  ].filter(Boolean);

  const base = parts.join(", ");
  const alt2 = `${modeLabel}: ${type} in ${area}${pricePart ? ` ${pricePart}` : ""}`;
  return [base, alt2].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 5);
}

async function suggestTitle(req, res, next) {
  try {
    const body = req.body || {};
    let suggestions = buildTitleSuggestions(body);
    const ai = await openAiTitles(body);
    if (ai && ai.length) suggestions = [...new Set([...ai, ...suggestions])].slice(0, 5);
    if (!suggestions.length) {
      return res.status(400).json({ message: "Not enough data to suggest a title." });
    }
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
}

async function suggestDescriptionHandler(req, res, next) {
  try {
    const body = req.body || {};
    let desc = await suggestDescription(body);
    if (!desc) {
      const mode = body.listingMode === "for_sale" ? "For sale" : "For rent";
      desc = `${mode} ${body.propertyType || "property"} in ${body.locationArea || "Addis Ababa"}. ${body.bedrooms || ""} bedrooms, ${body.bathrooms || ""} bathrooms, ${body.sizeM2 || ""} m².`;
    }
    res.json({ description: desc });
  } catch (error) {
    next(error);
  }
}

async function requestRemoval(req, res, next) {
  const body = req.body || {};
  if (body.website) return res.json({ ok: true });
  req.body = {
    firstName: "Listing",
    lastName: "Removal",
    email: body.email,
    phone: body.phone || "",
    message: [
      "Listing removal request",
      "",
      `Property ID: ${body.propertyId || "—"}`,
      `Reason: ${body.reason || "(not provided)"}`,
      body.propertyTitle ? `Title: ${body.propertyTitle}` : null,
      body.detailUrl ? `Source URL: ${body.detailUrl}` : null
    ]
      .filter(Boolean)
      .join("\n"),
    propertyId: body.propertyId,
    propertyTitle: body.propertyTitle,
    detailUrl: body.detailUrl,
    website: ""
  };
  return postContact(req, res, next);
}

module.exports = { suggestTitle, suggestDescriptionHandler, requestRemoval, buildTitleSuggestions };
