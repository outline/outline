import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { DecorationSet } from "prosemirror-view";
import Heading from "./Heading";

const heading = new Heading();
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: heading.schema,
    text: { group: "inline" },
  },
});

/** Builds a state with the heading's widget decorations enabled. */
function createState(level: number, text = "") {
  return EditorState.create({
    doc: schema.nodes.doc.create(
      null,
      schema.nodes.heading.create(
        { level },
        text ? schema.text(text) : undefined
      )
    ),
    plugins: heading.plugins,
  });
}

/** Reads the heading widgets through the plugin's public decorations prop. */
function widgetsIn(state: EditorState) {
  const plugin = state.plugins[0];
  const decorations = plugin.props.decorations?.call(plugin, state);
  if (!(decorations instanceof DecorationSet)) {
    throw new Error("Expected heading decorations");
  }
  return decorations.find();
}

describe("Heading widgets", () => {
  it.each([1, 2, 3, 4, 5, 6])(
    "leaves an empty level %i heading free of non-editable widgets",
    (level) => {
      const state = createState(level);
      expect(widgetsIn(state)).toEqual([]);
    }
  );

  it.each(["갈", "곡", "한", "안녕하세요", "English"])(
    "removes the link widget when deleting all of '%s' and restores it on input",
    (text) => {
      let state = createState(1, text);

      expect(widgetsIn(state).map((decoration) => decoration.spec.key)).toEqual(
        ["anchor"]
      );

      state = state.apply(
        state.tr.setSelection(TextSelection.create(state.doc, 1 + text.length))
      );
      state = state.apply(state.tr.delete(1, 1 + text.length));

      expect(state.selection.from).toBe(1);
      expect(state.doc.firstChild?.type).toBe(schema.nodes.heading);
      expect(widgetsIn(state)).toEqual([]);

      state = state.apply(state.tr.insertText("한"));

      expect(state.doc.firstChild?.textContent).toBe("한");
      expect(widgetsIn(state).map((decoration) => decoration.spec.key)).toEqual(
        ["anchor"]
      );
    }
  );
});
