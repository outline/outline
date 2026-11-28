import { buildDocumentName, parseDocumentName } from "./documentName";

const id = "6f2c3a4e-0f0a-4b5e-9a39-3a5f7c6d2b10";

describe("buildDocumentName", () => {
  it("omits the first generation", () => {
    expect(buildDocumentName(id, 0)).toBe(`document.${id}`);
  });

  it("includes later generations", () => {
    expect(buildDocumentName(id, 2)).toBe(`document.${id}.2`);
  });
});

describe("parseDocumentName", () => {
  it("parses names with and without a generation", () => {
    expect(parseDocumentName(`document.${id}`)).toEqual({
      documentId: id,
      stateGeneration: 0,
    });
    expect(parseDocumentName(`document.${id}.3`)).toEqual({
      documentId: id,
      stateGeneration: 3,
    });
  });

  it("refuses names that are not canonical", () => {
    expect(parseDocumentName(`document.${id}.0`)).toBeUndefined();
    expect(parseDocumentName(`document.${id}.01`)).toBeUndefined();
    expect(parseDocumentName(`document.${id}.-1`)).toBeUndefined();
    expect(parseDocumentName(`document.${id}.1.5`)).toBeUndefined();
    expect(parseDocumentName(`document.${id}.x`)).toBeUndefined();
    expect(parseDocumentName(`collection.${id}`)).toBeUndefined();
    expect(parseDocumentName("document.")).toBeUndefined();
  });
});
