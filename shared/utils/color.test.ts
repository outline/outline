import { hexToRgb } from "./color";

describe("#hexToRgb", () => {
  it("should throw error when invalid hex color is supplied", () => {
    const color = "#1f";
    expect(() => hexToRgb(color)).toThrow("Invalid hex color!");
  });

  it("should return rgb values for a three digit hex color", () => {
    const color = "#fff";
    expect(hexToRgb(color)).toEqual("255, 255, 255");
  });

  it("should return rbg values for a six digit hex color", () => {
    const color = "#ffffff";
    expect(hexToRgb(color)).toEqual("255, 255, 255");
  });
});
