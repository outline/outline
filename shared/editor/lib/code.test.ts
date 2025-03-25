import { getPrismLangForLanguage, getLabelForLanguage } from "./code";

describe("getPrismLangForLanguage", () => {
  it("should return the correct Prism language identifier for a given language", () => {
    expect(getPrismLangForLanguage("javascript")).toBe("javascript");
    expect(getPrismLangForLanguage("mermaidjs")).toBe("mermaid");
    expect(getPrismLangForLanguage("xml")).toBe("markup");
    expect(getPrismLangForLanguage("unknown")).toBeUndefined();
    expect(getPrismLangForLanguage("")).toBeUndefined();
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
