import { isPrintableKeyEvent } from "./keyboard";

describe("isPrintableKeyEvent", () => {
  it("should return true for character keys", () => {
    for (const key of ["a", "A", "1", " ", "/", "é", "😀", "ß"]) {
      expect(isPrintableKeyEvent({ key })).toBe(true);
    }
  });

  it("should return false for named keys", () => {
    for (const key of [
      "Enter",
      "Tab",
      "Shift",
      "Backspace",
      "ArrowLeft",
      "Escape",
      "Dead",
      "F1",
      "F24",
      "Unidentified",
    ]) {
      expect(isPrintableKeyEvent({ key })).toBe(false);
    }
  });
});
