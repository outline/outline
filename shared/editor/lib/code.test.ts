import { getRefractorLangForLanguage, getLabelForLanguage } from "./code";

describe("getRefractorLangForLanguage", () => {
  it("should return the correct lang identifier for a given language", () => {
    expect(getRefractorLangForLanguage("javascript")).toBe("javascript");
    expect(getRefractorLangForLanguage("mermaidjs")).toBe("mermaid");
    expect(getRefractorLangForLanguage("xml")).toBe("markup");
    expect(getRefractorLangForLanguage("unknown")).toBeUndefined();
    expect(getRefractorLangForLanguage("")).toBeUndefined();
  });
});

describe("getLabelForLanguage", () => {
  it("should return the correct human-readable label for a given language", () => {
    expect(getLabelForLanguage("javascript")).toBe("JavaScript");
    expect(getLabelForLanguage("mermaidjs")).toBe("Mermaid Diagram");
    expect(getLabelForLanguage("xml")).toBe("XML");
    expect(getLabelForLanguage("unknown")).toBe("Plain text");
    expect(getLabelForLanguage("none")).toBe("Plain text");
    expect(getLabelForLanguage("")).toBe("Plain text");
  });
});
