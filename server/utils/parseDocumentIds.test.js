// @flow
import parseDocumentIds from "./parseDocumentIds";

it("should not return non links", () => {
  expect(parseDocumentIds(`# Header`).length).toBe(0);
});

it("should return an array of document ids", () => {
  const result = parseDocumentIds(`# Header
  
  [internal](/doc/test-456733)
  `);

  expect(result.length).toBe(1);
  expect(result[0]).toBe("test-456733");
});

it("should not return duplicate document ids", () => {
  expect(parseDocumentIds(`# Header`).length).toBe(0);

  const result = parseDocumentIds(`# Header
  
  [internal](/doc/test-456733)

  [another link to the same doc](/doc/test-456733)
  `);

  expect(result.length).toBe(1);
  expect(result[0]).toBe("test-456733");
});

it("should not return non document links", () => {
  expect(parseDocumentIds(`[google](http://www.google.com)`).length).toBe(0);
});

it("should not return non document relative links", () => {
  expect(parseDocumentIds(`[relative](/developers)`).length).toBe(0);
});
