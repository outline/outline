import isMarkdown from "./isMarkdown";

test("returns false for an empty string", () => {
  expect(isMarkdown("")).toBe(false);
});

test("returns false for plain text", () => {
  expect(isMarkdown("plain text")).toBe(false);
});

test("returns true for bullet list", () => {
  expect(
    isMarkdown(`- item one
- item two
  - nested item`)
  ).toBe(true);
});

test("returns true for numbered list", () => {
  expect(
    isMarkdown(`1. item one
1. item two`)
  ).toBe(true);
  expect(
    isMarkdown(`1. item one
2. item two`)
  ).toBe(true);
});

test("returns true for code fence", () => {
  expect(
    isMarkdown(`\`\`\`javascript
this is code
\`\`\``)
  ).toBe(true);
});

test("returns false for non-closed fence", () => {
  expect(
    isMarkdown(`\`\`\`
this is not code
`)
  ).toBe(false);
});

test("returns true for heading", () => {
  expect(isMarkdown(`# Heading 1`)).toBe(true);
  expect(isMarkdown(`## Heading 2`)).toBe(true);
  expect(isMarkdown(`### Heading 3`)).toBe(true);
});

test("returns false for hashtag", () => {
  expect(isMarkdown(`Test #hashtag`)).toBe(false);
  expect(isMarkdown(` #hashtag`)).toBe(false);
});

test("returns true for absolute link", () => {
  expect(isMarkdown(`[title](http://www.google.com)`)).toBe(true);
});

test("returns true for relative link", () => {
  expect(isMarkdown(`[title](/doc/mydoc-234tnes)`)).toBe(true);
});

test("returns true for relative image", () => {
  expect(isMarkdown(`![alt](/coolimage.png)`)).toBe(true);
});

test("returns true for absolute image", () => {
  expect(isMarkdown(`![alt](https://www.google.com/coolimage.png)`)).toBe(true);
});
