import { extensionManager, findNodes, schema } from "../../test/editor";
import { ImageSource } from "../lib/FileHelper";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

const findImageNode = (doc: ReturnType<typeof parser.parse>) => {
  const imageNode = findNodes(doc?.toJSON(), "image")[0];
  if (!imageNode?.attrs) {
    throw new Error("Expected image node with attributes");
  }
  return { ...imageNode, attrs: imageNode.attrs };
};

describe("Image node source attribute round-trip", () => {
  it("preserves diagrams.net source through markdown serialize → parse", () => {
    const doc = parser.parse(
      `![](https://example.com/diagram.svg "source=${ImageSource.DiagramsNet}")`
    );
    const imageNode = findImageNode(doc);
    expect(imageNode).toBeDefined();
    expect(imageNode.attrs.source).toBe(ImageSource.DiagramsNet);
  });

  it("serializes source tag back into markdown", () => {
    const doc = parser.parse(
      `![](https://example.com/diagram.svg "source=${ImageSource.DiagramsNet}")`
    );
    const markdown = serializer.serialize(doc);
    expect(markdown).toContain(`source=${ImageSource.DiagramsNet}`);
  });

  it("round-trips a diagrams.net image without losing source", () => {
    const original = `![](https://example.com/diagram.svg "source=${ImageSource.DiagramsNet}")`;
    const doc1 = parser.parse(original);
    const md1 = serializer.serialize(doc1);
    const doc2 = parser.parse(md1);
    const imageNode = findImageNode(doc2);
    expect(imageNode.attrs.source).toBe(ImageSource.DiagramsNet);
  });

  it("preserves source alongside size and title", () => {
    const doc = parser.parse(
      `![](https://example.com/diagram.svg "source=${ImageSource.DiagramsNet} Caption =100x100")`
    );
    const imageNode = findImageNode(doc);
    expect(imageNode.attrs.source).toBe(ImageSource.DiagramsNet);
    expect(imageNode.attrs.width).toBe(100);
    expect(imageNode.attrs.height).toBe(100);
  });

  it("does not set source for regular images", () => {
    const doc = parser.parse(`![](https://example.com/photo.png)`);
    const imageNode = findImageNode(doc);
    expect(imageNode.attrs.source).toBeFalsy();
  });

  it("does not leak source token into title", () => {
    const doc = parser.parse(
      `![](https://example.com/diagram.svg "source=${ImageSource.DiagramsNet} My Caption")`
    );
    const imageNode = findImageNode(doc);
    expect(imageNode.attrs.source).toBe(ImageSource.DiagramsNet);
    expect(imageNode.attrs.title).not.toContain("source=");
  });

  it("preserves source-like text inside a caption", () => {
    const doc = parser.parse(
      `![](https://example.com/diagram.svg "Caption source=example")`
    );
    const imageNode = findImageNode(doc);
    expect(imageNode.attrs.source).toBeFalsy();
    expect(imageNode.attrs.title).toBe("Caption source=example");
  });
});
