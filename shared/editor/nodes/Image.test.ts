import type { EditorState } from "prosemirror-state";
import type * as React from "react";
import type { Editor } from "../../../app/editor";
import {
  createEditorState,
  doc,
  findNodes,
  parser,
  schema,
  serializer,
} from "../../test/editor";
import { ImageSource } from "../lib/FileHelper";
import type { ComponentProps } from "../types";
import Image from "./Image";

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

describe("Image caption blur", () => {
  const createEditor = (state: EditorState) => {
    const dispatch = vi.fn();
    const image = new Image();
    image.bindEditor({ view: { state, dispatch } } as unknown as Editor);
    return { image, dispatch };
  };

  const blurEvent = (innerText: string) =>
    ({
      currentTarget: { innerText },
    }) as unknown as React.FocusEvent<HTMLParagraphElement>;

  const imageDoc = () =>
    doc(
      schema.nodes.paragraph.create(
        null,
        schema.nodes.image.create({
          src: "https://example.com/a.png",
          alt: "old",
        })
      )
    );

  it("updates the caption when the node is still in the document", () => {
    const state = createEditorState(imageDoc());
    const { image, dispatch } = createEditor(state);
    const node = state.doc.nodeAt(1)!;

    image.handleCaptionBlur({ node, getPos: () => 1 } as ComponentProps)(
      blurEvent("new")
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].doc.nodeAt(1)?.attrs.alt).toBe("new");
  });

  it("ignores the blur when the node view has been destroyed", () => {
    const state = createEditorState(imageDoc());
    const { image, dispatch } = createEditor(state);
    const node = state.doc.nodeAt(1)!;
    const getPos = () => undefined as unknown as number;

    expect(() =>
      image.handleCaptionBlur({ node, getPos } as ComponentProps)(
        blurEvent("new")
      )
    ).not.toThrow();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("ignores the blur when the position no longer holds an image", () => {
    const state = createEditorState(imageDoc());
    const { image, dispatch } = createEditor(state);
    const node = state.doc.nodeAt(1)!;

    image.handleCaptionBlur({ node, getPos: () => 0 } as ComponentProps)(
      blurEvent("new")
    );

    expect(dispatch).not.toHaveBeenCalled();
  });
});
