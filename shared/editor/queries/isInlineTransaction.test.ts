import type { Node as ProsemirrorNode } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import {
  createEditorState,
  doc,
  heading,
  p,
  schema,
} from "@shared/test/editor";
import { isInlineTransaction } from "./isInlineTransaction";

const { strong } = schema.marks;

/**
 * Document layout (positions are the start of each block's content):
 *
 *   1  paragraph "first"
 *   8  heading   "title"
 *  15  paragraph "second"
 */
function state() {
  return createEditorState(doc([p("first"), heading("title"), p("second")]));
}

describe("isInlineTransaction", () => {
  describe("inline edits", () => {
    it("is true for an empty transaction", () => {
      expect(isInlineTransaction(state().tr)).toBe(true);
    });

    it("is true when typing inside a paragraph", () => {
      const tr = state().tr.insertText("x", 3);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true when typing at the start and end of a textblock", () => {
      const s = state();
      expect(isInlineTransaction(s.tr.insertText("x", 1))).toBe(true);
      expect(isInlineTransaction(s.tr.insertText("x", 6))).toBe(true);
    });

    it("is true when deleting text within one textblock", () => {
      const tr = state().tr.delete(2, 4);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true when deleting all text in a textblock", () => {
      const tr = state().tr.delete(1, 6);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true when replacing a text selection with text", () => {
      const tr = state().tr.insertText("replacement", 2, 5);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true for mark changes", () => {
      const s = state();
      expect(isInlineTransaction(s.tr.addMark(1, 6, strong.create()))).toBe(
        true
      );
      expect(isInlineTransaction(s.tr.removeMark(1, 6, strong))).toBe(true);
    });

    it("is true when inserting an inline node", () => {
      const tr = state().tr.insert(
        3,
        schema.nodes.emoji.create({ "data-name": "smile" })
      );
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true for a sequence of inline steps", () => {
      const tr = state()
        .tr.insertText("a", 3)
        .delete(1, 2)
        .addMark(1, 4, strong.create())
        .insertText("b", 16);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is true when only the selection changes", () => {
      const s = state();
      const tr = s.tr.setSelection(TextSelection.create(s.doc, 3));
      expect(isInlineTransaction(tr)).toBe(true);
    });
  });

  describe("structural edits", () => {
    it("is false when splitting a textblock", () => {
      const tr = state().tr.split(3);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when joining two textblocks", () => {
      // Delete across the boundary between the first paragraph and heading
      const tr = state().tr.delete(5, 9);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when deleting a range that spans blocks", () => {
      const tr = state().tr.delete(2, 17);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when inserting a block node", () => {
      const tr = state().tr.insert(7, p("inserted"));
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when deleting a whole block", () => {
      const tr = state().tr.delete(7, 14);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when replacing the whole document", () => {
      const s = state();
      const tr = s.tr.replaceWith(0, s.doc.content.size, [p("new")]);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when changing a block type", () => {
      const tr = state().tr.setBlockType(1, 1, schema.nodes.heading, {
        level: 2,
      });
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when wrapping a block", () => {
      const s = state();
      const range = s.doc.resolve(1).blockRange(s.doc.resolve(6));
      const tr = s.tr.wrap(range!, [{ type: schema.nodes.blockquote }]);
      expect(isInlineTransaction(tr)).toBe(false);
    });

    it("is false when one step in a sequence is structural", () => {
      const tr = state().tr.insertText("a", 3).split(4);
      expect(isInlineTransaction(tr)).toBe(false);
    });
  });

  describe("attribute changes", () => {
    it("is true for a node attribute change by default", () => {
      const tr = state().tr.setNodeAttribute(7, "level", 3);
      expect(isInlineTransaction(tr)).toBe(true);
    });

    it("is false when the predicate flags the changed node", () => {
      const tr = state().tr.setNodeAttribute(7, "level", 3);
      const isHeading = (node: ProsemirrorNode) => node.type.name === "heading";
      expect(isInlineTransaction(tr, isHeading)).toBe(false);
    });

    it("is true when the predicate does not match the changed node", () => {
      const tr = state().tr.setNodeAttribute(7, "level", 3);
      const isParagraph = (node: ProsemirrorNode) =>
        node.type.name === "paragraph";
      expect(isInlineTransaction(tr, isParagraph)).toBe(true);
    });

    it("is true for document attribute changes", () => {
      const tr = state().tr.setDocAttribute("title", "x");
      expect(isInlineTransaction(tr)).toBe(true);
    });
  });
});
