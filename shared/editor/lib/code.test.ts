import Storage from "../../utils/Storage";
import {
  getRefractorLangForLanguage,
  getLabelForLanguage,
  setRecentlyUsedCodeLanguage,
  getRecentlyUsedCodeLanguage,
  getFrequentCodeLanguages,
} from "./code";

describe("getRefractorLangForLanguage", () => {
  it("should return the correct lang identifier for a given language", () => {
    expect(getRefractorLangForLanguage("javascript")).toBe("javascript");
    expect(getRefractorLangForLanguage("mermaid")).toBe("mermaid");
    expect(getRefractorLangForLanguage("mermaidjs")).toBe("mermaid");
    expect(getRefractorLangForLanguage("xml")).toBe("markup");
    expect(getRefractorLangForLanguage("diff")).toBe("diff");
    expect(getRefractorLangForLanguage("fortran")).toBe("fortran");
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
    expect(getLabelForLanguage("fortran")).toBe("Fortran");
    expect(getLabelForLanguage("unknown")).toBe("Plain text");
    expect(getLabelForLanguage("none")).toBe("Plain text");
    expect(getLabelForLanguage("")).toBe("Plain text");
  });
});

describe("setRecentlyUsedCodeLanguage", () => {
  beforeEach(() => {
    Storage.clear();
  });

  it("should remember the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should not remember mermaid as the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    setRecentlyUsedCodeLanguage("mermaid");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should not remember mermaidjs as the last selected code language", () => {
    setRecentlyUsedCodeLanguage("javascript");
    setRecentlyUsedCodeLanguage("mermaidjs");
    expect(getRecentlyUsedCodeLanguage()).toBe("javascript");
  });

  it("should ignore mermaid that was already persisted", () => {
    Storage.set("rme-code-language", "mermaid");
    expect(getRecentlyUsedCodeLanguage()).toBeUndefined();
  });
});

describe("getFrequentCodeLanguages", () => {
  beforeEach(() => {
    Storage.clear();
  });

  it("should exclude mermaid that was already persisted", () => {
    Storage.set("frequent-code-languages", {
      javascript: 3,
      mermaid: 5,
      mermaidjs: 2,
    });
    expect(getFrequentCodeLanguages()).toEqual(["javascript"]);
  });
});
