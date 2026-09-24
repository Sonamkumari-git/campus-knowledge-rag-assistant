import { describe, expect, it } from "vitest";
import { buildGroundedFallback, retrieveChunks } from "./campusData";

describe("campus retrieval", () => {
  it("finds the attendance policy from the indexed corpus", () => {
    const results = retrieveChunks("What attendance percentage is required for exams?");
    expect(results[0]?.documentName).toContain("Academic Rules");
    expect(results[0]?.content).toContain("75%");
  });

  it("returns a safe fallback when the corpus has no matching evidence", () => {
    const results = retrieveChunks("What is the fee for a new marine biology course?");
    expect(results).toHaveLength(0);
    expect(buildGroundedFallback("new course fee", results)).toContain("couldn't find reliable information");
  });

  it("supports document category filtering", () => {
    const results = retrieveChunks("quiet hours overnight guests", "Hostel");
    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("Hostel");
  });
});
