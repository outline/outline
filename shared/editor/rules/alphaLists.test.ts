import markdownit from "markdown-it";
import alphaListsRule from "../rules/alphaLists";

describe("Alpha Lists Plugin", () => {
  it("should parse lowercase alphabetic lists", () => {
    const md = markdownit().use(alphaListsRule);
    const result = md.parse("a. First item\nb. Second item", {});

    // Find ordered_list_open token
    const listToken = result.find((t) => t.type === "ordered_list_open");
    expect(listToken).toBeDefined();
    expect(listToken?.attrGet("data-list-style")).toBe("lower-alpha");
  });

  it("should parse uppercase alphabetic lists", () => {
    const md = markdownit().use(alphaListsRule);
    const result = md.parse("A. First item\nB. Second item", {});

    // Find ordered_list_open token
    const listToken = result.find((t) => t.type === "ordered_list_open");
    expect(listToken).toBeDefined();
    expect(listToken?.attrGet("data-list-style")).toBe("upper-alpha");
  });

  it("should preserve numeric lists", () => {
    const md = markdownit().use(alphaListsRule);
    const result = md.parse("1. First item\n2. Second item", {});

    // Find ordered_list_open token
    const listToken = result.find((t) => t.type === "ordered_list_open");
    expect(listToken).toBeDefined();
    expect(listToken?.attrGet("data-list-style")).toBeNull();
  });

  it("should handle the issue example", () => {
    const md = markdownit().use(alphaListsRule);
    const text = `## 3. Step Three

a. Do this.

b. Do that.`;

    const result = md.parse(text, {});

    // Check that we have an ordered list
    const listToken = result.find((t) => t.type === "ordered_list_open");
    expect(listToken).toBeDefined();
    expect(listToken?.attrGet("data-list-style")).toBe("lower-alpha");

    // Check that we have two list items
    const listItems = result.filter((t) => t.type === "list_item_open");
    expect(listItems.length).toBe(2);
  });

  it("should handle multiple separate alpha lists", () => {
    const md = markdownit().use(alphaListsRule);
    const text = `a. First list item

b. Second list item

Some text in between

A. Upper list item

B. Upper list item 2`;

    const result = md.parse(text, {});

    // Check that we have two ordered lists
    const listTokens = result.filter((t) => t.type === "ordered_list_open");
    expect(listTokens.length).toBe(2);
    expect(listTokens[0]?.attrGet("data-list-style")).toBe("lower-alpha");
    expect(listTokens[1]?.attrGet("data-list-style")).toBe("upper-alpha");
  });
});
