// @flow
import parseImages from "./parseImages";

it("should not return non images", () => {
  expect(parseImages(`# Header`).length).toBe(0);
});

it("should return an array of images", () => {
  const result = parseImages(`# Header
  
  ![internal](/attachments/image.png)
  `);

  expect(result.length).toBe(1);
  expect(result[0]).toBe("/attachments/image.png");
});

it("should not return non document links", () => {
  expect(parseImages(`[google](http://www.google.com)`).length).toBe(0);
});

it("should not return non document relative links", () => {
  expect(parseImages(`[relative](/developers)`).length).toBe(0);
});
