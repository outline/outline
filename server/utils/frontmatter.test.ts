import { parseFrontmatter, serializeFrontmatter } from "./frontmatter";

describe("parseFrontmatter", () => {
  it("should parse frontmatter and strip it from the content", () => {
    const { data, content } = parseFrontmatter(`---
Status: In progress
Priority: 2
---

# Title

Body`);
    expect(data).toEqual({ Status: "In progress", Priority: 2 });
    expect(content).toEqual("\n# Title\n\nBody");
  });

  it("should return undefined data when no frontmatter is present", () => {
    const input = "# Title\n\nBody";
    const { data, content } = parseFrontmatter(input);
    expect(data).toBeUndefined();
    expect(content).toEqual(input);
  });

  it("should return undefined data for invalid YAML", () => {
    const input = "---\n: : :\n  bad: [\n---\n\nBody";
    const { data, content } = parseFrontmatter(input);
    expect(data).toBeUndefined();
    expect(content).toEqual(input);
  });

  it("should return undefined data for non-object YAML", () => {
    const input = "---\njust a string\n---\n\nBody";
    const { data, content } = parseFrontmatter(input);
    expect(data).toBeUndefined();
    expect(content).toEqual(input);
  });

  it("should ignore frontmatter not at the start", () => {
    const input = "# Title\n\n---\nStatus: done\n---\n";
    const { data } = parseFrontmatter(input);
    expect(data).toBeUndefined();
  });
});

describe("serializeFrontmatter", () => {
  it("should serialize data to a frontmatter block", () => {
    const block = serializeFrontmatter({ Status: "In progress", Priority: 2 });
    expect(block).toEqual("---\nStatus: In progress\nPriority: 2\n---\n\n");
  });

  it("should return an empty string for empty data", () => {
    expect(serializeFrontmatter({})).toEqual("");
  });

  it("should round-trip through parseFrontmatter", () => {
    const data = {
      Status: "In progress",
      Tags: ["a", "b"],
      Done: false,
    };
    const markdown = `${serializeFrontmatter(data)}# Title`;
    const parsed = parseFrontmatter(markdown);
    expect(parsed.data).toEqual(data);
    expect(parsed.content.trim()).toEqual("# Title");
  });
});
