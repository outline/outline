import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { parseNotionTags } from "./NotionTags";

type Properties = PageObjectResponse["properties"];

function multiSelectProperty(names: string[]): Properties[string] {
  return {
    id: "prop-multi",
    type: "multi_select",
    multi_select: names.map((name, index) => ({
      id: `opt-${index}`,
      name,
      color: "blue",
    })),
  };
}

function selectProperty(name: string | null): Properties[string] {
  return {
    id: "prop-select",
    type: "select",
    select: name ? { id: "opt-0", name, color: "blue" } : null,
  };
}

function titleProperty(text: string): Properties[string] {
  return {
    id: "title",
    type: "title",
    title: [
      {
        type: "text",
        text: { content: text, link: null },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        plain_text: text,
        href: null,
      },
    ],
  };
}

describe("parseNotionTags", () => {
  it("reads names from a multi_select property named Tags", () => {
    const properties = {
      Name: titleProperty("Invented page"),
      Tags: multiSelectProperty(["invented-one", "invented-two"]),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([
      "invented-one",
      "invented-two",
    ]);
  });

  it("matches the property name case-insensitively", () => {
    const properties = {
      tags: multiSelectProperty(["invented-lower"]),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual(["invented-lower"]);
  });

  it("reads a single name from a select property named Labels", () => {
    const properties = {
      Labels: selectProperty("invented-label"),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual(["invented-label"]);
  });

  it("combines Tags and Labels properties when both are present", () => {
    const properties = {
      Tags: multiSelectProperty(["invented-one"]),
      Labels: selectProperty("invented-label"),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([
      "invented-one",
      "invented-label",
    ]);
  });

  it("ignores properties not named Tags or Labels", () => {
    const properties = {
      Categories: multiSelectProperty(["invented-category"]),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([]);
  });

  it("ignores a Tags property that is not multi_select or select", () => {
    const properties = {
      Tags: titleProperty("not a tag list"),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([]);
  });

  it("returns an empty array when a select property has no value", () => {
    const properties = {
      Tags: selectProperty(null),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([]);
  });

  it("returns an empty array when there are no matching properties", () => {
    const properties = {
      Name: titleProperty("Invented page"),
    } as unknown as Properties;

    expect(parseNotionTags(properties)).toEqual([]);
  });
});
