import { NodeSelection } from "prosemirror-state";
import type { EditorState } from "prosemirror-state";
import { createEditorState, p, schema } from "@shared/test/editor";
import { isAspectRatioLocked } from "../queries/isAspectRatioLocked";
import { toggleAspectRatioLock } from "./toggleAspectRatioLock";

const { embed, attachment } = schema.nodes;

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
  it("starts embeds unlocked", () => {
    const node = selectedEmbed().doc.child(0);
    expect(node.attrs.lockAspectRatio).toBeNull();
    expect(isAspectRatioLocked(node)).toBe(false);
  });

  it("locks an unlocked embed and keeps it selected", () => {
    const next = toggle(selectedEmbed());
    expect(next?.doc.firstChild?.attrs.lockAspectRatio).toBe(true);
    expect(next?.selection).toBeInstanceOf(NodeSelection);
  });

  it("clears the attribute when returning to the type default", () => {
    const next = toggle(selectedEmbed({ lockAspectRatio: true }));
    expect(next?.doc.firstChild?.attrs.lockAspectRatio).toBeNull();
  });

  it("starts attachments locked and stores false when unlocked", () => {
    const state = createEditorState(
      schema.nodes.doc.create(null, [
        attachment.create({ title: "file.pdf", preview: true }),
        p(""),
      ])
    );
    const selected = state.apply(
      state.tr.setSelection(NodeSelection.create(state.doc, 0))
    );
    expect(isAspectRatioLocked(selected.doc.child(0))).toBe(true);

    let next: EditorState | undefined;
    toggleAspectRatioLock(attachment)(selected, (tr) => {
      next = selected.apply(tr);
    });
    expect(next?.doc.firstChild?.attrs.lockAspectRatio).toBe(false);
  });

  it("does not apply to other node types", () => {
    const state = createEditorState(schema.nodes.doc.create(null, [p("text")]));
    expect(toggleAspectRatioLock(embed)(state)).toBe(false);
  });
});
