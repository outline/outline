import { getRefractorLangForLanguage, getLabelForLanguage } from "./code";

describe("getRefractorLangForLanguage", () => {
  it("should return the correct lang identifier for a given language", () => {
    expect(getRefractorLangForLanguage("javascript")).toBe("javascript");
    expect(getRefractorLangForLanguage("mermaid")).toBe("mermaid");
    expect(getRefractorLangForLanguage("mermaidjs")).toBe("mermaid");
    expect(getRefractorLangForLanguage("xml")).toBe("markup");
    expect(getRefractorLangForLanguage("diff")).toBe("diff");
    expect(getRefractorLangForLanguage("unknown")).toBeUndefined();
    expect(getRefractorLangForLanguage("")).toBeUndefined();
  });
});

describe("getLabelForLanguage", () => {
  it("should return the correct human-readable label for a given language", () => {
    expect(getLabelForLanguage("javascript")).toBe("JavaScript");
    expect(getLabelForLanguage("mermaid")).toBe("Mermaid");
    expect(getLabelForLanguage("mermaidjs")).toBe("Mermaid");
    expect(getLabelForLanguage("xml")).toBe("XML");
    expect(getLabelForLanguage("diff")).toBe("Diff");
    expect(getLabelForLanguage("unknown")).toBe("Plain text");
    expect(getLabelForLanguage("none")).toBe("Plain text");
    expect(getLabelForLanguage("")).toBe("Plain text");
  });
});
