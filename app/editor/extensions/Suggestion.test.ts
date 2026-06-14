import type { Node } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import Placeholder from "@shared/editor/marks/Placeholder";
import { schema } from "@shared/test/editor";
import type { Editor } from "~/editor";
import Suggestion from "~/editor/extensions/Suggestion";

/**
 * A minimal stand-in for EditorView that holds editor state and applies
 * dispatched transactions, which is sufficient to exercise the plugin props
 * (handleKeyDown / handleTextInput) used by the suggestion and placeholder
 * plugins without a real DOM.
 */
function createFakeView(initial: EditorState): EditorView {
  let state = initial;
  const view = {
    composing: false,
    get state() {
      return state;
    },
    dispatch(tr: EditorState["tr"]) {
      state = state.apply(tr);
    },
    focus() {
      // no-op
    },
  };
  return view as unknown as EditorView;
}

/**
 * Builds the mention-style suggestion extension (mirrors MentionMenuExtension's
 * options) and a placeholder plugin behaving as if a document was created from a
 * template (template === false), then types "@" at the given selection.
 */
function typeTriggerInPlaceholder(docNode: Node, selectionPos: number) {
  const suggestion = new Suggestion({
    trigger: ["@", "＠"],
    allowSpaces: true,
    requireSearchTerm: false,
    enabledInCode: false,
  });
  const suggestionPlugin = suggestion.plugins[0];

  const placeholder = new Placeholder();
  placeholder.bindEditor({ props: { template: false } } as unknown as Editor);
  const placeholderPlugin = placeholder.plugins[0];

  let state = EditorState.create({
    doc: docNode,
    schema,
    plugins: [placeholderPlugin, suggestionPlugin],
  });
  state = state.apply(
    state.tr.setSelection(TextSelection.near(state.doc.resolve(selectionPos)))
  );

  const view = createFakeView(state);

  // handleKeyDown fires first and schedules the re-evaluation, then the
  // placeholder plugin consumes the text input (which blocks input rules).
  const handled = suggestionPlugin.props.handleKeyDown?.call(
    suggestionPlugin,
    view,
    {
      key: "@",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
    } as KeyboardEvent
  );

  const { from, to } = view.state.selection;
  const consumed = placeholderPlugin.props.handleTextInput?.call(
    placeholderPlugin,
    view,
    from,
    to,
    "@",
    () => view.state.tr
  );

  // The re-evaluation that opens the menu runs on a timeout.
  vi.runAllTimers();

  return { suggestion, handled, consumed };
}

describe("Suggestion menu inside a template placeholder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the menu when typing @ inside a placeholder in a paragraph", () => {
    const mark = schema.marks.placeholder.create();
    const paragraph = schema.nodes.paragraph.create(
      null,
      schema.text("Name", [mark])
    );
    const docNode = schema.nodes.doc.create(null, paragraph);

    const { suggestion, handled, consumed } = typeTriggerInPlaceholder(
      docNode,
      2
    );

    expect(handled).toBe(false);
    // The placeholder plugin consumes the input, blocking the normal input rule.
    expect(consumed).toBe(true);
    expect(suggestion.isOpen).toBe(true);
  });

  it("opens the menu when typing @ inside a placeholder in an info notice", () => {
    const mark = schema.marks.placeholder.create();
    const paragraph = schema.nodes.paragraph.create(
      null,
      schema.text("Name", [mark])
    );
    const notice = schema.nodes.container_notice.create(
      { style: "info" },
      paragraph
    );
    const docNode = schema.nodes.doc.create(null, notice);

    const { suggestion, consumed } = typeTriggerInPlaceholder(docNode, 3);

    expect(consumed).toBe(true);
    expect(suggestion.isOpen).toBe(true);
  });
});
