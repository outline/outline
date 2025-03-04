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

test("returns true for code fence", () => {
  expect(
    isMarkdown(`\`\`\`javascript
this is code
\`\`\``)
  ).toBe(true);
});

test("returns true for latex fence", () => {
  expect(isMarkdown(`\$i\$`)).toBe(true);
  expect(
    isMarkdown(`\$0.00
random content
\$1.00`)
  ).toBe(false);
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

test("returns true for table", () => {
  expect(
    isMarkdown(`
|NAME|TYPE|CLUSTER-IP|EXTERNAL-IP|PORT(S)|AGE|
|-|-|-|-|-|-|
|rancher-webhook|ClusterIP|10.43.198.97|<none>|443/TCP|258d|
|rancher|ClusterIP|10.43.50.214|<none>|80/TCP,443/TCP|258d|
`)
  ).toBe(true);

  expect(
    isMarkdown(`
| Product | Price ($) | Inventory |
|---------|----------:|----------:|
| Laptop | 899.99 | 52 |
| Wireless Mouse | 24.99 | 120 |`)
  ).toBe(true);
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
