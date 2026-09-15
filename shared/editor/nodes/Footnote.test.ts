import { TextSelection } from "prosemirror-state";
import {
  createEditorState,
  parser,
  schema,
  serializer,
} from "../../test/editor";
import FootnoteReference from "./FootnoteReference";

const roundTrip = (markdown: string) =>
  serializer.serialize(parser.parse(markdown)).trim();

describe("Footnote serialization", () => {
  it("serializes references and definitions as GitHub Flavored Markdown", () => {
    const markdown = "Hello[^1] world\n\n[^1]: The note.";
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it("serializes multi-paragraph footnotes with indentation", () => {
    const markdown =
      "Hello[^1]\n\n[^1]: First paragraph.\n\n    Second paragraph.";
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it("serializes several footnotes", () => {
    const markdown = "One[^1] two[^2]\n\n[^1]: First.\n\n[^2]: Second.";
    expect(roundTrip(markdown)).toBe(markdown);
  });
});

describe("FootnoteReference command", () => {
  const type = schema.nodes.footnote_reference;
  const command = new FootnoteReference().commands({ type })();

  const run = (markdown: string, pos: number) => {
    let state = createEditorState(parser.parse(markdown));
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, pos))
    );
    const handled = command(state, (tr) => {
      state = state.apply(tr);
    });
    expect(handled).toBe(true);
    return state;
  };

  it("inserts a reference and an empty footnote at the end of the document", () => {
    const state = run("Hello world", 6);

    expect(serializer.serialize(state.doc).trim()).toBe(
      "Hello[^1] world\n\n[^1]: \\"
    );
    // The selection is moved into the new footnote.
    expect(state.selection.$from.node(-1).type.name).toBe("footnote");
  });

  it("appends to an existing footnote list with the next label", () => {
    const state = run("Hello[^1] world\n\n[^1]: The note.", 7);

    expect(serializer.serialize(state.doc).trim()).toBe(
      "Hello[^1][^2] world\n\n[^1]: The note.\n\n[^2]: \\"
    );
  });
});
