import { toColorFormats, validateColorHex } from "./color";

describe("validateColorHex", () => {
  it("accepts 3-digit hex", () => {
    expect(validateColorHex("#fff")).toBe(true);
    expect(validateColorHex("#ABC")).toBe(true);
    expect(validateColorHex("#000")).toBe(true);
  });

  it("accepts 4-digit hex with alpha", () => {
    expect(validateColorHex("#fff8")).toBe(true);
    expect(validateColorHex("#ABCD")).toBe(true);
  });

  it("accepts 6-digit hex", () => {
    expect(validateColorHex("#FDEA9B")).toBe(true);
    expect(validateColorHex("#ffffff")).toBe(true);
  });

  it("accepts 8-digit hex with alpha", () => {
    expect(validateColorHex("#FDEA9BB3")).toBe(true);
    expect(validateColorHex("#00000080")).toBe(true);
  });

  it("rejects strings missing the leading #", () => {
    expect(validateColorHex("ffffff")).toBe(false);
    expect(validateColorHex("fff")).toBe(false);
  });

  it("rejects hex strings of unsupported lengths", () => {
    expect(validateColorHex("#")).toBe(false);
    expect(validateColorHex("#f")).toBe(false);
    expect(validateColorHex("#ff")).toBe(false);
    expect(validateColorHex("#fffff")).toBe(false);
    expect(validateColorHex("#fffffff")).toBe(false);
    expect(validateColorHex("#fffffffff")).toBe(false);
  });

  it("rejects strings containing non-hex characters", () => {
    expect(validateColorHex("#fffz")).toBe(false);
    expect(validateColorHex("#xyz")).toBe(false);
    expect(validateColorHex("#GGG")).toBe(false);
  });

  it("rejects color names and CSS values", () => {
    expect(validateColorHex("red")).toBe(false);
    expect(validateColorHex("rgb(0, 0, 0)")).toBe(false);
  });

  it("rejects strings with CSS injection payloads", () => {
    expect(
      validateColorHex("#fff; background-image: url(https://evil.example)")
    ).toBe(false);
    expect(validateColorHex("#fff;")).toBe(false);
  });
});

describe("toColorFormats", () => {
  it("translates hex into rgb and hsl", () => {
    expect(toColorFormats("#ff0000")).toEqual({
      hex: "#FF0000",
      rgb: "rgb(255, 0, 0)",
      hsl: "hsl(0, 100%, 50%)",
    });
  });

  it("returns shorthand hex without expanding it", () => {
    expect(toColorFormats("#fff")).toEqual({
      hex: "#FFF",
      rgb: "rgb(255, 255, 255)",
      hsl: "hsl(0, 0%, 100%)",
    });
  });

  it("returns the input notation unchanged", () => {
    expect(toColorFormats("hsl(68, 69%, 45%)").hsl).toBe("hsl(68, 69%, 45%)");
    expect(toColorFormats("rgba(0,0,0,.25)").rgb).toBe("rgba(0,0,0,.25)");
    expect(toColorFormats("hsla(0, 0%, 0%, 0.253)").hsl).toBe(
      "hsla(0, 0%, 0%, 0.253)"
    );
  });

  it("preserves alpha across notations", () => {
    expect(toColorFormats("#ff000080")).toEqual({
      hex: "#FF000080",
      rgb: "rgba(255, 0, 0, 0.5)",
      hsl: "hsla(0, 100%, 50%, 0.5)",
    });
  });

  it("accepts rgb and hsl input", () => {
    expect(toColorFormats("rgb(0, 0, 255)").hex).toBe("#0000FF");
    expect(toColorFormats("hsl(120, 100%, 50%)").hex).toBe("#00FF00");
    expect(toColorFormats("rgba(0, 0, 0, 0.25)").hsl).toBe(
      "hsla(0, 0%, 0%, 0.25)"
    );
  });

  it("throws for values that are not colors", () => {
    expect(() => toColorFormats("rgb(foo)")).toThrow();
  });
});
