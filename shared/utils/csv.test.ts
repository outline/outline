import { CSVHelper } from "./csv";

describe("CSVHelper", () => {
  describe("sanitizeValue", () => {
    it("should leave a value unchanged", () => {
      const value = "Hello, World!";
      const sanitizedValue = CSVHelper.sanitizeValue(value);
      expect(sanitizedValue).toBe(value);
    });

    it("should escape formula trigger character", () => {
      expect(CSVHelper.sanitizeValue("@1x2")).toBe(`'@1x2`);
      expect(CSVHelper.sanitizeValue("=1x2")).toBe(`'=1x2`);
      expect(CSVHelper.sanitizeValue("＝1x2")).toBe(`'＝1x2`);
      expect(CSVHelper.sanitizeValue("≠1x2")).toBe(`'≠1x2`);
      expect(CSVHelper.sanitizeValue("+1x2")).toBe(`'+1x2`);
      expect(CSVHelper.sanitizeValue("∑1x2")).toBe(`'∑1x2`);
    });

    it("should remove control characters", () => {
      expect(CSVHelper.sanitizeValue("\t1x2")).toBe(`1x2`);
    });

    it("should remove zero-width characters", () => {
      expect(CSVHelper.sanitizeValue("\u200B1x2")).toBe(`1x2`);
    });

    it("should remove whitespace characters", () => {
      expect(CSVHelper.sanitizeValue("\u200B1x2")).toBe(`1x2`);
    });
  });
});
