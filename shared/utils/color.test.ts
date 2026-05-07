import { validateColorHex } from "./color";

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
