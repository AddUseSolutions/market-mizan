const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveRejectionReason, REJECTION_REASONS } = require("./rejectionReasons");

test("known code uses the predefined explanation and keeps the note", () => {
  const r = resolveRejectionReason({ reasonCode: "photos", note: "Please add kitchen photos" });
  assert.equal(r.ok, true);
  assert.equal(r.label, "Photos missing or poor quality");
  assert.match(r.explanation, /clear, recent photos/);
  assert.equal(r.note, "Please add kitchen photos");
  assert.equal(r.stored, "Photos missing or poor quality: Please add kitchen photos");
});

test("other requires a written reason, which becomes the explanation", () => {
  assert.equal(resolveRejectionReason({ reasonCode: "other" }).ok, false);
  const r = resolveRejectionReason({ reasonCode: "other", note: "Owner asked us to remove it" });
  assert.equal(r.ok, true);
  assert.equal(r.explanation, "Owner asked us to remove it");
  assert.equal(r.note, "");
});

test("missing or unknown code is rejected; legacy free text maps to other", () => {
  assert.equal(resolveRejectionReason({}).ok, false);
  assert.equal(resolveRejectionReason({ reasonCode: "nope" }).ok, false);
  const legacy = resolveRejectionReason({ reason: "Does not meet guidelines" });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.code, "other");
});

test("every predefined reason except other has an explanation", () => {
  for (const r of REJECTION_REASONS) {
    if (r.code !== "other") assert.ok(r.explanation.length > 20, r.code);
  }
});
