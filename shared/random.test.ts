import { randomString } from "./random";

describe("randomString", () => {
  describe("with number parameter", () => {
    it("should generate string of correct length", () => {
      const result = randomString(10);
      expect(result).toHaveLength(10);
    });

    it("should generate alphanumeric mixed case by default", () => {
      const result = randomString(100);
      expect(result).toMatch(/^[a-zA-Z0-9]+$/);
      // Check that it contains both cases and numbers (with high probability)
      expect(result).toMatch(/[a-z]/);
      expect(result).toMatch(/[A-Z]/);
      expect(result).toMatch(/[0-9]/);
    });

    it("should generate different strings on multiple calls", () => {
      const result1 = randomString(20);
      const result2 = randomString(20);
      expect(result1).not.toEqual(result2);
    });
  });

  describe("with object parameter", () => {
    describe("charset: numeric", () => {
      it("should generate only numbers", () => {
        const result = randomString({ length: 50, charset: "numeric" });
        expect(result).toMatch(/^[0-9]+$/);
        expect(result).toHaveLength(50);
      });

      it("should ignore capitalization for numeric charset", () => {
        const lowercase = randomString({
          length: 50,
          charset: "numeric",
          capitalization: "lowercase",
        });
        const uppercase = randomString({
          length: 50,
          charset: "numeric",
          capitalization: "uppercase",
        });
        const mixed = randomString({
          length: 50,
          charset: "numeric",
          capitalization: "mixed",
        });

        expect(lowercase).toMatch(/^[0-9]+$/);
        expect(uppercase).toMatch(/^[0-9]+$/);
        expect(mixed).toMatch(/^[0-9]+$/);
      });
    });

    describe("charset: alphabetic", () => {
      it("should generate only letters with mixed capitalization by default", () => {
        const result = randomString({ length: 100, charset: "alphabetic" });
        expect(result).toMatch(/^[a-zA-Z]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
      });

      it("should generate only lowercase letters", () => {
        const result = randomString({
          length: 50,
          charset: "alphabetic",
          capitalization: "lowercase",
        });
        expect(result).toMatch(/^[a-z]+$/);
        expect(result).toHaveLength(50);
      });

      it("should generate only uppercase letters", () => {
        const result = randomString({
          length: 50,
          charset: "alphabetic",
          capitalization: "uppercase",
        });
        expect(result).toMatch(/^[A-Z]+$/);
        expect(result).toHaveLength(50);
      });

      it("should generate mixed case letters", () => {
        const result = randomString({
          length: 100,
          charset: "alphabetic",
          capitalization: "mixed",
        });
        expect(result).toMatch(/^[a-zA-Z]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
      });
    });

    describe("charset: alphanumeric", () => {
      it("should generate letters and numbers with mixed capitalization by default", () => {
        const result = randomString({ length: 100, charset: "alphanumeric" });
        expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
        expect(result).toMatch(/[0-9]/);
      });

      it("should generate lowercase letters and numbers", () => {
        const result = randomString({
          length: 100,
          charset: "alphanumeric",
          capitalization: "lowercase",
        });
        expect(result).toMatch(/^[a-z0-9]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[0-9]/);
      });

      it("should generate uppercase letters and numbers", () => {
        const result = randomString({
          length: 100,
          charset: "alphanumeric",
          capitalization: "uppercase",
        });
        expect(result).toMatch(/^[A-Z0-9]+$/);
        expect(result).toMatch(/[A-Z]/);
        expect(result).toMatch(/[0-9]/);
      });

      it("should generate mixed case letters and numbers", () => {
        const result = randomString({
          length: 100,
          charset: "alphanumeric",
          capitalization: "mixed",
        });
        expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
        expect(result).toMatch(/[0-9]/);
      });
    });

    describe("default values", () => {
      it("should default to alphanumeric charset", () => {
        const result = randomString({ length: 100 });
        expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
        expect(result).toMatch(/[0-9]/);
      });

      it("should default to mixed capitalization", () => {
        const result = randomString({ length: 100, charset: "alphabetic" });
        expect(result).toMatch(/^[a-zA-Z]+$/);
        expect(result).toMatch(/[a-z]/);
        expect(result).toMatch(/[A-Z]/);
      });
    });

    describe("edge cases", () => {
      it("should handle length of 1", () => {
        const result = randomString({ length: 1, charset: "alphabetic" });
        expect(result).toHaveLength(1);
        expect(result).toMatch(/^[a-zA-Z]$/);
      });

      it("should handle length of 0", () => {
        const result = randomString({ length: 0 });
        expect(result).toHaveLength(0);
        expect(result).toBe("");
      });

      it("should generate different strings on multiple calls", () => {
        const result1 = randomString({
          length: 20,
          charset: "alphanumeric",
          capitalization: "lowercase",
        });
        const result2 = randomString({
          length: 20,
          charset: "alphanumeric",
          capitalization: "lowercase",
        });
        expect(result1).not.toEqual(result2);
      });
    });
  });
});
