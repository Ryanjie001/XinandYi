import assert from "node:assert/strict";
import { anniversaryRemaining, daysUntil, isOnThisDay } from "../src/lib/dates";

assert.equal(anniversaryRemaining("2020-11-02", true, "2026-11-02"), 0);
assert.equal(anniversaryRemaining("2020-02-29", true, "2025-02-27"), 1);
assert.equal(anniversaryRemaining("2020-02-29", true, "2024-02-28"), 1);
assert.equal(
  anniversaryRemaining("2028-05-10", true, "2026-11-02"),
  daysUntil("2028-05-10", "2026-11-02"),
);
assert.equal(anniversaryRemaining("2026-11-01", false, "2026-11-02"), -1);
assert.equal(isOnThisDay("2020-11-02", "2026-11-02"), true);
assert.equal(isOnThisDay("2026-11-02", "2026-11-02"), false);
assert.equal(isOnThisDay("2020-02-29", "2025-02-28"), false);
console.log("Anniversary and on-this-day date checks passed.");
