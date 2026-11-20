import { NodeSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import { createEditorState, p, schema } from "@shared/test/editor";
import { toggleAspectRatioLock } from "./toggleAspectRatioLock";

const { embed } = schema.nodes;

/**
 * Creates a state with an embed node selected.
 *
 * @param attrs - the embed attributes.
 * @returns the editor state.
 */
function selectedEmbed(attrs: Record<string, unknown> = {}) {
  const state = createEditorState(
    schema.nodes.doc.create(null, [
      embed.create({ href: "https://example.com", ...attrs }),
      p(""),
    ])
  );
  return state.apply(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
}

/**
 * Runs the command and returns the resulting state.
 *
 * @param state - the editor state.
 * @returns the state after the command, or undefined if it did not apply.
 */
function toggle(state: EditorState) {
  let next: EditorState | undefined;
  toggleAspectRatioLock(embed)(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

describe("toggleAspectRatioLock", () => {
  it("defaults to locked", () => {
    expect(selectedEmbed().doc.firstChild?.attrs.lockAspectRatio).toBeNull();
  });

  it("unlocks a locked node and keeps it selected", () => {
    const next = toggle(selectedEmbed());
    expect(next?.doc.firstChild?.attrs.lockAspectRatio).toBe(false);
    expect(next?.selection).toBeInstanceOf(NodeSelection);
  });

  it("clears the attribute when locking again", () => {
    const next = toggle(selectedEmbed({ lockAspectRatio: false }));
    expect(next?.doc.firstChild?.attrs.lockAspectRatio).toBeNull();
  });

  it("does not apply to other node types", () => {
    const state = createEditorState(schema.nodes.doc.create(null, [p("text")]));
    expect(toggleAspectRatioLock(embed)(state)).toBe(false);
  });
});
