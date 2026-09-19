import type { Schema } from "prosemirror-model";
import makeRules from "./rules";

const tableMarkdown = "| a | b |\n| --- | --- |\n| 1 | 2 |";

const schemaWith = (nodes: string[]) =>
  ({
    nodes: Object.fromEntries(nodes.map((name) => [name, {}])),
  }) as unknown as Schema;

describe("makeRules", () => {
  it("parses tables when the schema supports them", () => {
    const md = makeRules({ schema: schemaWith(["table"]) });
    const types = md.parse(tableMarkdown, {}).map((token) => token.type);
    expect(types).toContain("table_open");
  });

  it("does not emit table tokens when the schema lacks table support", () => {
    const md = makeRules({ schema: schemaWith([]) });
    const types = md.parse(tableMarkdown, {}).map((token) => token.type);
    expect(types).not.toContain("table_open");
  });

  it("does not emit heading tokens for setext headings when the schema lacks heading support", () => {
    const md = makeRules({ schema: schemaWith([]) });
    const types = md.parse("Title\n=====\n", {}).map((token) => token.type);
    expect(types).not.toContain("heading_open");
  });

  it("does not emit code_block tokens when the schema lacks code block support", () => {
    const md = makeRules({ schema: schemaWith([]) });
    const indented = md.parse("    foo\n", {}).map((token) => token.type);
    const fenced = md.parse("```\nfoo\n```\n", {}).map((token) => token.type);
    expect(indented).not.toContain("code_block");
    expect(fenced).not.toContain("fence");
  });
});
