import MarkdownHelper from "./MarkdownHelper";

describe("#MarkdownHelper", () => {
  it("should serialize title and text", () => {
    expect(MarkdownHelper.toMarkdown({ title: "Title", text: "Test" })).toEqual(
      "# Title\n\nTest"
    );
  });

  it("should trim backslashes", () => {
    expect(
      MarkdownHelper.toMarkdown({
        title: "Title",
        text: "One\n\\\nTest\n\\",
      })
    ).toEqual("# Title\n\nOne\n\nTest");
  });
});
