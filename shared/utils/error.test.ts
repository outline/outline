import { toError, errToString } from "./error";

describe("toError", () => {
  it("returns the same Error instance when given an Error", () => {
    const error = new Error("boom");
    expect(toError(error)).toBe(error);
  });

  it("preserves Error subclasses", () => {
    const error = new TypeError("nope");
    expect(toError(error)).toBe(error);
  });

  it("wraps a string in an Error", () => {
    expect(toError("boom")).toBeInstanceOf(Error);
    expect(toError("boom").message).toBe("boom");
  });

  it("wraps non-string values using their string representation", () => {
    expect(toError(42).message).toBe("42");
    expect(toError(null).message).toBe("null");
    expect(toError(undefined).message).toBe("undefined");
  });
});

describe("errToString", () => {
  it("returns the message of an Error", () => {
    expect(errToString(new Error("boom"))).toBe("boom");
  });

  it("returns the string representation of a non-Error", () => {
    expect(errToString("boom")).toBe("boom");
    expect(errToString(42)).toBe("42");
    expect(errToString(undefined)).toBe("undefined");
  });
});
