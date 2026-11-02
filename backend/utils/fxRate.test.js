const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseNbeUsdEtb, getEtbPerUsd, getFxStatus } = require("./fxRate");

describe("NBE FX parse", () => {
  it("reads USD/ETB from the Frankfurter NBE array", () => {
    const parsed = parseNbeUsdEtb([
      { date: "2026-11-02", base: "USD", quote: "EUR", rate: 0.89 },
      { date: "2026-11-02", base: "USD", quote: "ETB", rate: 160.9988 }
    ]);
    assert.equal(parsed.rate, 160.9988);
    assert.equal(parsed.date, "2026-11-02");
  });

  it("rejects nonsense rates", () => {
    assert.equal(parseNbeUsdEtb([{ base: "USD", quote: "ETB", rate: 1 }]), null);
  });

  it("falls back until a live rate is cached", () => {
    const rate = getEtbPerUsd();
    assert.ok(rate >= 150);
    const status = getFxStatus();
    assert.equal(status.etbPerUsd, rate);
  });
});
