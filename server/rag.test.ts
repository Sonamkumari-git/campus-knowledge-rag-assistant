import { describe, expect, it } from "vitest";
import { addUploadedPdf, buildGroundedFallback, retrieveChunks } from "./campusData";

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

  it("indexes uploaded PDF text so later questions can retrieve it", () => {
    addUploadedPdf("Student Conduct Upload Test.pdf", "The student conduct policy requires visitors to sign in at the residence desk after 8 PM.", 2);
    const results = retrieveChunks("When must visitors sign in at the residence desk after 8 PM?");
    expect(results.some(result => result.documentName === "Student Conduct Upload Test.pdf")).toBe(true);
  });
});
