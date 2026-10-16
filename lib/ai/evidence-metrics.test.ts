import { describe, expect, it } from "vitest";
import {
  calibrateThreshold,
  scoreEvidence,
  type EvidenceSample,
} from "./evidence-metrics";

const sample = (over: Partial<EvidenceSample>): EvidenceSample => ({
  queryId: "q",
  rank: 0,
  grade: 2,
  supporting: [0],
  reviewIndex: 0,
  similarity: 0.7,
  verbatim: true,
  ...over,
});

describe("scoreEvidence", () => {
  it("counts supporting quotes on strong top-3 results and stray quotes elsewhere", () => {
    const samples = [
      sample({}),
      sample({ reviewIndex: 1 }), // wrong review quoted
      sample({ similarity: 0.2 }), // hidden by threshold
      sample({ rank: 5 }), // outside top 3: ignored for support
      sample({ grade: 0, similarity: 0.6 }), // stray quote
      sample({ grade: 0, similarity: 0.3 }),
    ];
    expect(scoreEvidence(samples, 0.5)).toEqual({
      threshold: 0.5,
      supportRate: 1 / 3,
      falseEvidenceRate: 1 / 2,
    });
  });
});

describe("calibrateThreshold", () => {
  it("picks the highest threshold that keeps support at 80%", () => {
    const samples = [
      ...Array.from({ length: 5 }, (_, i) =>
        sample({ similarity: 0.5 + i * 0.1 }),
      ),
      sample({ grade: 0, similarity: 0.55 }),
    ];
    expect(calibrateThreshold(samples, [0.4, 0.5, 0.6, 0.7])?.threshold).toBe(
      0.6,
    );
    expect(calibrateThreshold(samples, [0.95])).toBeNull();
  });
});
