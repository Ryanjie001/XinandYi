import assert from "node:assert/strict";
import { nextLunarOccurrence, readableLunarDate } from "../src/lib/dates";

// Chinese New Year crosses Gregorian years, and today itself has no days remaining.
assert.equal(nextLunarOccurrence("01-01", false, "2024-02-10"), 0);
assert.equal(nextLunarOccurrence("01-01", false, "2024-01-01"), 40);
assert.equal(nextLunarOccurrence("01-01", false, "2024-02-11"), 353);

// 2023 had a leap second month; 2024 did not.
assert.equal(nextLunarOccurrence("02-01", true, "2023-03-22"), 0);
assert.equal(nextLunarOccurrence("02-01", true, "2024-03-10"), 0);
assert.equal(nextLunarOccurrence("02-01", false, "2023-02-20"), 0);

// The third lunar month in 2024 had only 29 days.
assert.equal(nextLunarOccurrence("03-30", false, "2024-05-07"), 0);
assert.equal(nextLunarOccurrence("03-30", false, "2024-05-06"), 1);
assert.equal(nextLunarOccurrence("13-01", false, "2024-01-01"), null);
assert.equal(readableLunarDate("02-01", true), "农历 闰2 月 1 日");
console.log("Lunar birthday countdown checks passed.");
