import { extensionManager, findNodes, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

describe("Video", () => {
  it("parses dimensions from markdown", () => {
    const doc = parser
      .parse("[title 100x50](/api/attachments.redirect?id=123)")
      ?.toJSON();
    const [video] = findNodes(doc, "video");

    expect(video).toBeDefined();
    expect(video?.attrs?.width).toBe(100);
    expect(video?.attrs?.height).toBe(50);
  });

  it("serializes missing dimensions as empty rather than null", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "video",
          attrs: {
            src: "/api/attachments.redirect?id=123",
            title: "title",
            width: null,
            height: null,
          },
        },
      ],
    });

    const markdown = serializer.serialize(doc);
    expect(markdown).not.toContain("null");
    expect(markdown).toContain("[title x](/api/attachments.redirect?id=123)");

    // Round-trips back to a video node rather than a plain link
    const [video] = findNodes(parser.parse(markdown)?.toJSON(), "video");
    expect(video).toBeDefined();
  });

  it("normalizes non-numeric dimensions to null", () => {
    const doc = parser
      .parse("[title nullxnull](/api/attachments.redirect?id=123)")
      ?.toJSON();
    const [video] = findNodes(doc, "video");

    expect(video).toBeDefined();
    expect(video?.attrs?.width).toBeNull();
    expect(video?.attrs?.height).toBeNull();
  });
});
