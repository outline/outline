import { schema, createEditorState, doc, p } from "@shared/test/editor";
import { getDocumentTextColors } from "./getDocumentTextColors";
import { toggleMark } from "../commands/toggleMark";
import { TextSelection, type Transaction } from "prosemirror-state";

describe("getDocumentTextColors", () => {
  it("returns empty array when no text colors exist", () => {
    const testDoc = doc([p("Plain text without text colors")]);
    const state = createEditorState(testDoc);

    const colors = getDocumentTextColors(state);

    expect(colors).toEqual([]);
  });

  it("returns unique text colors from document", () => {
    // Create text with textColor marks
    const textColorMark1 = schema.marks.textColor.create({ color: "#E00000" });
    const textColorMark2 = schema.marks.textColor.create({ color: "#2563EB" });

    const text1 = schema.text("Red text 1", [textColorMark1]);
    const text2 = schema.text(" and blue ", [textColorMark2]);
    const text3 = schema.text("and red again", [textColorMark1]);

    const testDoc = doc([
      schema.nodes.paragraph.create(null, [text1, text2, text3]),
    ]);
    const state = createEditorState(testDoc);

    const colors = getDocumentTextColors(state);

    expect(colors).toHaveLength(2);
    expect(colors).toContain("#E00000");
    expect(colors).toContain("#2563EB");
  });

  it("deduplicates colors used multiple times", () => {
    const textColorMark = schema.marks.textColor.create({ color: "#E00000" });

    const text1 = schema.text("First red text", [textColorMark]);
    const text2 = schema.text("Second red text", [textColorMark]);

    const testDoc = doc([
      schema.nodes.paragraph.create(null, [text1]),
      schema.nodes.paragraph.create(null, [text2]),
    ]);
    const state = createEditorState(testDoc);

    const colors = getDocumentTextColors(state);

    expect(colors).toHaveLength(1);
    expect(colors).toContain("#E00000");
  });

  it("ignores text with other marks but no text color", () => {
    const boldMark = schema.marks.strong.create();
    const textColorMark = schema.marks.textColor.create({ color: "#E00000" });

    const boldText = schema.text("Bold text", [boldMark]);
    const coloredText = schema.text("Colored text", [textColorMark]);

    const testDoc = doc([
      schema.nodes.paragraph.create(null, [boldText, coloredText]),
    ]);
    const state = createEditorState(testDoc);

    const colors = getDocumentTextColors(state);

    expect(colors).toHaveLength(1);
    expect(colors).toContain("#E00000");
  });

  describe("textColor toggleMark command", () => {
    it("applies and updates color marks", () => {
      const testDoc = doc([p("Hello world")]);
      let state = createEditorState(testDoc);

      // Select "Hello" (pos 1 to 6)
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 6)));

      // Toggle color `#E00000`
      const type = schema.marks.textColor;
      const cmd = toggleMark(type, { color: "#E00000" });
      cmd(state, (tr: Transaction) => {
        state = state.apply(tr);
      });

      // Check that "Hello" has the textColor mark with "#E00000"
      const firstChild = state.doc.firstChild!;
      let textNode = firstChild.child(0);
      expect(textNode.text).toBe("Hello");
      expect(textNode.marks).toHaveLength(1);
      expect(textNode.marks[0].type.name).toBe("textColor");
      expect(textNode.marks[0].attrs.color).toBe("#E00000");

      // Now toggle color `#2563EB` on the same selection
      const cmd2 = toggleMark(type, { color: "#2563EB" });
      cmd2(state, (tr: Transaction) => {
        state = state.apply(tr);
      });

      // Check that it updated to "#2563EB"
      const updatedFirstChild = state.doc.firstChild!;
      let updatedTextNode = updatedFirstChild.child(0);
      expect(updatedTextNode.text).toBe("Hello");
      expect(updatedTextNode.marks).toHaveLength(1);
      expect(updatedTextNode.marks[0].type.name).toBe("textColor");
      expect(updatedTextNode.marks[0].attrs.color).toBe("#2563EB");
    });

    it("removes textColor mark when toggled with color null", () => {
      const type = schema.marks.textColor;
      const red = type.create({ color: "#E00000" });
      const testDoc = doc([
        schema.nodes.paragraph.create(null, [schema.text("Hello", [red])]),
      ]);
      let state = createEditorState(testDoc);

      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 6)));
      const cmd = toggleMark(type, { color: null });
      cmd(state, (tr: Transaction) => {
        state = state.apply(tr);
      });

      const firstChild = state.doc.firstChild!;
      const textNode = firstChild.child(0);
      expect(textNode.text).toBe("Hello");
      expect(textNode.marks).toHaveLength(0);
    });

    it("clears textColor when matching color exists in part of selection", () => {
      const type = schema.marks.textColor;
      const red = type.create({ color: "#E00000" });
      const testDoc = doc([
        schema.nodes.paragraph.create(null, [
          schema.text("Hello", [red]),
          schema.text(" world"),
        ]),
      ]);
      let state = createEditorState(testDoc);

      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, 12)));
      const cmd = toggleMark(type, { color: "#E00000" });
      cmd(state, (tr: Transaction) => {
        state = state.apply(tr);
      });

      const firstChild = state.doc.firstChild!;
      for (let i = 0; i < firstChild.childCount; i++) {
        const textNode = firstChild.child(i);
        expect(textNode.marks.find((mark) => mark.type === type)).toBeUndefined();
      }
    });
  });
});

