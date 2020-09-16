// @flow
import parseImages from "./parseImages";

it("should not return non images", () => {
  expect(parseImages(`# Header`).length).toBe(0);
});

it("should return an array of document ids", () => {
  const result = parseImages(`# Header
  
  ![internal](/doc/test-456733)
  `);

  expect(result.length).toBe(1);
  expect(result[0]).toBe("test-456733");
});

it("should not return non document links", () => {
  expect(parseImages(`[google](http://www.google.com)`).length).toBe(0);
});

it("should not return non document relative links", () => {
  expect(parseImages(`[relative](/developers)`).length).toBe(0);
});
