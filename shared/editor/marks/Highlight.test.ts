import { DOMParser } from "prosemirror-model";
import { schema } from "@shared/test/editor";

/**
 * Parses an HTML string with the editor schema, in the same way as pasted
 * content, and returns the resulting document as JSON.
 */
function parseHTML(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return DOMParser.fromSchema(schema).parse(element).toJSON();
}

// Shared tests run in both node and jsdom; parsing HTML requires a DOM.
describe.runIf(typeof document !== "undefined")("highlight parsing", () => {
  it("parses a preset background color as the matching preset", () => {
    const doc = parseHTML(
      `<p><span style="background-color: #FDEA9B">text</span></p>`
    );
    expect(doc.content[0].content[0].marks).toEqual([
      { type: "highlight", attrs: { color: "#FDEA9B" } },
    ]);
  });

  it("matches a preset rendered translucently", () => {
    const doc = parseHTML(
      `<p><span style="background-color: rgba(253, 234, 155, 0.4)">text</span></p>`
    );
    expect(doc.content[0].content[0].marks).toEqual([
      { type: "highlight", attrs: { color: "#FDEA9B" } },
    ]);
  });

  it("ignores backgrounds that are not a preset color", () => {
    const doc = parseHTML(
      `<p><span style="background-color: rgb(147, 196, 125)">one</span><span style="background-color: #FDEA9C">two</span><span style="background-color: #ffffff">three</span><span style="background-color: transparent">four</span></p>`
    );
    expect(doc.content[0].content[0].marks).toBeUndefined();
    expect(doc.content[0].content).toHaveLength(1);
  });

  it("ignores a background inherited from a shaded table cell", () => {
    const doc = parseHTML(
      `<table><tbody><tr><td style="background-color: #FDEA9B"><p><span style="background-color: #FDEA9B">text</span></p></td></tr></tbody></table>`
    );
    const cell = doc.content[0].content[0].content[0];
    expect(cell.attrs.marks).toEqual([
      { type: "background", attrs: { color: "#fdea9b" } },
    ]);
    expect(cell.content[0].content[0].marks).toBeUndefined();
  });

  it("ignores a background inherited through transparent ancestors", () => {
    const doc = parseHTML(
      `<table><tbody><tr><td style="background-color: #FDEA9B"><p style="background-color: transparent"><span style="background-color: #FDEA9B">text</span></p></td></tr></tbody></table>`
    );
    const cell = doc.content[0].content[0].content[0];
    expect(cell.content[0].content[0].marks).toBeUndefined();
  });

  it("keeps a highlight that differs from the table cell background", () => {
    const doc = parseHTML(
      `<table><tbody><tr><td style="background-color: #93c47d"><p><span style="background-color: #FDEA9B">text</span></p></td></tr></tbody></table>`
    );
    const cell = doc.content[0].content[0].content[0];
    expect(cell.content[0].content[0].marks).toEqual([
      { type: "highlight", attrs: { color: "#FDEA9B" } },
    ]);
  });
});
