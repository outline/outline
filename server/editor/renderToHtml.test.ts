import renderToHtml from "./renderToHtml";

test("renders an empty string", () => {
  expect(renderToHtml("")).toBe("");
});

test("renders plain text as paragraph", () => {
  expect(renderToHtml("plain text")).toMatchSnapshot();
});

test("renders blockquote", () => {
  expect(renderToHtml("> blockquote")).toMatchSnapshot();
});

test("renders code block", () => {
  expect(
    renderToHtml(`
    this is indented code
`)
  ).toMatchSnapshot();
});

test("renders code fence", () => {
  expect(
    renderToHtml(`\`\`\`javascript
this is code
\`\`\``)
  ).toMatchSnapshot();
});

test("renders checkbox list", () => {
  expect(
    renderToHtml(`- [ ] unchecked
- [x] checked`)
  ).toMatchSnapshot();
});

test("renders bullet list", () => {
  expect(
    renderToHtml(`- item one
- item two
  - nested item`)
  ).toMatchSnapshot();
});

test("renders info notice", () => {
  expect(
    renderToHtml(`:::info
content of notice
:::`)
  ).toMatchSnapshot();
});

test("renders warning notice", () => {
  expect(
    renderToHtml(`:::warning
content of notice
:::`)
  ).toMatchSnapshot();
});

test("renders tip notice", () => {
  expect(
    renderToHtml(`:::tip
content of notice
:::`)
  ).toMatchSnapshot();
});

test("renders headings", () => {
  expect(
    renderToHtml(`# Heading 1

## Heading 2

### Heading 3

#### Heading 4`)
  ).toMatchSnapshot();
});

test("renders horizontal rule", () => {
  expect(renderToHtml(`---`)).toMatchSnapshot();
});

test("renders image", () => {
  expect(
    renderToHtml(`![caption](https://lorempixel.com/200/200)`)
  ).toMatchSnapshot();
});

test("renders image with alignment", () => {
  expect(
    renderToHtml(`![caption](https://lorempixel.com/200/200 "left-40")`)
  ).toMatchSnapshot();
});

test("renders table", () => {
  expect(
    renderToHtml(`
| heading | centered | right aligned |
|---------|:--------:|--------------:|
|         | center   |               |
|         |          |      bottom r |
`)
  ).toMatchSnapshot();
});

test("renders bold marks", () => {
  expect(renderToHtml(`this is **bold** text`)).toMatchSnapshot();
});

test("renders code marks", () => {
  expect(renderToHtml(`this is \`inline code\` text`)).toMatchSnapshot();
});

test("renders highlight marks", () => {
  expect(renderToHtml(`this is ==highlighted== text`)).toMatchSnapshot();
});

test("renders italic marks", () => {
  expect(renderToHtml(`this is *italic* text`)).toMatchSnapshot();
  expect(renderToHtml(`this is _also italic_ text`)).toMatchSnapshot();
});

test("renders template placeholder marks", () => {
  expect(renderToHtml(`this is !!a placeholder!!`)).toMatchSnapshot();
});

test("renders underline marks", () => {
  expect(renderToHtml(`this is __underlined__ text`)).toMatchSnapshot();
});

test("renders link marks", () => {
  expect(
    renderToHtml(`this is [linked](https://www.example.com) text`)
  ).toMatchSnapshot();
});

test("renders underline marks", () => {
  expect(renderToHtml(`this is ~~strikethrough~~ text`)).toMatchSnapshot();
});

test("renders ordered list", () => {
  expect(
    renderToHtml(`1. item one
1. item two`)
  ).toMatchSnapshot();

  expect(
    renderToHtml(`1. item one
2. item two`)
  ).toMatchSnapshot();
});
