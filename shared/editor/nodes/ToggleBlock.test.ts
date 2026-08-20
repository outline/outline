import { EditorState } from "prosemirror-state";
import type { Decoration } from "prosemirror-view";
import { schema } from "../../test/editor";
import ToggleBlock, { toggleFoldPluginKey } from "./ToggleBlock";

// The document is a single toggle block (pos 0) with a "Hello" title paragraph
// and a "World" body paragraph. The title node therefore spans [1, 8): its
// opening token at 1, the five text characters at 2..6, and its closing token
// at 7. Its content ends (typing position at the end of the title) at 7.
const TITLE_START = 1;
const TITLE_END = 8;

/**
 * Builds a document with a single toggle block titled "Hello" and a body of
 * "World", with its id already assigned so the ID-assignment plugin stays idle.
 */
const createState = (): EditorState => {
  const toggle = schema.nodes.container_toggle.create(
    { id: "t1" },
    [
      schema.nodes.paragraph.create(null, schema.text("Hello")),
      schema.nodes.paragraph.create(null, schema.text("World")),
    ]
  );

  return EditorState.create({
    doc: schema.nodes.doc.create(null, toggle),
    schema,
    plugins: new ToggleBlock().plugins,
  });
};

/** The head decoration wrapping the toggle block's title (first child). */
const headDecoration = (state: EditorState): Decoration | undefined =>
  toggleFoldPluginKey
    .getState(state)!
    .decorations.find()
    .find((d) => d.spec.target === "container_toggle>:firstChild");

/**
 * Asserts the head decoration still wraps the title exactly after the edit,
 * and that neither the head nor the fold decoration was dropped.
 */
const assertHeadWrapsTitle = (state: EditorState) => {
  const title = state.doc.firstChild!.firstChild!;

  const head = headDecoration(state);
  expect(head).toBeDefined();
  expect(head!.from).toBe(TITLE_START);
  expect(head!.to).toBe(TITLE_START + title.nodeSize);
  expect(
    toggleFoldPluginKey.getState(state)!.decorations.find().length
  ).toBe(2);
};

describe("ToggleBlock fold decoration mapping on plain text edits", () => {
  it("keeps the head decoration wrapping the title when typing at its start", () => {
    const state = createState();
    const next = state.apply(state.tr.insertText("X", TITLE_START + 1));
    assertHeadWrapsTitle(next);
  });

  it("keeps the head decoration wrapping the title when typing at its end", () => {
    const state = createState();
    const next = state.apply(state.tr.insertText("X", TITLE_END - 1));
    assertHeadWrapsTitle(next);
  });

  it("keeps the head decoration wrapping the title when typing in its middle", () => {
    const state = createState();
    const next = state.apply(state.tr.insertText("X", TITLE_START + 3));
    assertHeadWrapsTitle(next);
  });
});
