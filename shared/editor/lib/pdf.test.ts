import {
  pdfNaturalHeight,
  pdfNaturalWidth,
  resolvePDFDimensions,
  scalePDFDimensions,
} from "./pdf";

describe("resolvePDFDimensions", () => {
  it("returns the natural dimensions when none are stored", () => {
    expect(resolvePDFDimensions(null, null)).toEqual({
      width: pdfNaturalWidth,
      height: pdfNaturalHeight,
    });
  });

  it("keeps stored dimensions that do not match the natural ratio", () => {
    expect(resolvePDFDimensions(700, 400)).toEqual({
      width: 700,
      height: 400,
    });
  });

  it("derives a missing height from the natural ratio", () => {
    expect(resolvePDFDimensions(384)).toEqual({
      width: 384,
      height: pdfNaturalHeight / 2,
    });
  });
});

describe("scalePDFDimensions", () => {
  it("keeps the aspect ratio of the given dimensions", () => {
    expect(scalePDFDimensions({ width: 700, height: 400 }, 350)).toEqual({
      width: 350,
      height: 200,
    });
  });
});
