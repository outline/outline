import { TextSelection } from "prosemirror-state";
import {
  createEditorStateWithSelection,
  doc,
  p,
  schema,
} from "@shared/test/editor";
import { isMarkActive } from "./isMarkActive";

const { strong, highlight } = schema.marks;

/**
 * Creates a state with a cursor in the middle of a short paragraph.
 */
function stateWithCursor() {
  return createEditorStateWithSelection(doc(p("text")), 3);
}

describe("isMarkActive", () => {
  it("is inactive with nothing at the cursor", () => {
    expect(isMarkActive(strong)(stateWithCursor())).toBe(false);
  });

  it("is active for a mark stored at the cursor", () => {
    const state = stateWithCursor();
    const next = state.apply(state.tr.addStoredMark(strong.create()));

    expect(isMarkActive(strong)(next)).toBe(true);
  });

  it("matches the attributes of a mark stored at the cursor", () => {
    const state = stateWithCursor();
    const next = state.apply(
      state.tr.addStoredMark(highlight.create({ color: "#FDEA9B" }))
    );

    expect(isMarkActive(highlight, { color: "#FDEA9B" })(next)).toBe(true);
    expect(isMarkActive(highlight, { color: "#D9FBE8" })(next)).toBe(false);
  });

  it("is active for a mark on the text around the cursor", () => {
    const state = createEditorStateWithSelection(
      doc(
        schema.nodes.paragraph.create(
          null,
          schema.text("text", [strong.create()])
        )
      ),
      3
    );

    expect(isMarkActive(strong)(state)).toBe(true);
  });

  it("matches the attributes of a mark across a selected range", () => {
    const state = createEditorStateWithSelection(
      doc(
        schema.nodes.paragraph.create(
          null,
          schema.text("text", [highlight.create({ color: "#FDEA9B" })])
        )
      ),
      3
    );
    const next = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1, 5))
    );

    expect(isMarkActive(highlight, { color: "#FDEA9B" })(next)).toBe(true);
    expect(isMarkActive(highlight, { color: "#D9FBE8" })(next)).toBe(false);
  });
});
