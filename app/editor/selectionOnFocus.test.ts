import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

describe("editor selection after focus", () => {
  it("selects from the current document when focus replaces the editor state during a click", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "block+" },
        paragraph: { content: "text*", group: "block", toDOM: () => ["p", 0] },
        atom: { group: "block", atom: true, toDOM: () => ["hr"] },
        text: { group: "inline" },
      },
    });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const view = new EditorView(container, {
      state: EditorState.create({
        schema,
        doc: schema.node("doc", null, [schema.node("atom")]),
      }),
      handleDOMEvents: {
        focus: (editorView) => {
          editorView.updateState(
            EditorState.create({
              schema,
              doc: schema.node("doc", null, [schema.node("paragraph")]),
            })
          );
          return false;
        },
      },
      dispatchTransaction: (transaction) => {
        view.updateState(view.state.apply(transaction));
      },
    });

    vi.spyOn(view, "posAtCoords").mockReturnValue({ pos: 0, inside: 0 });
    let caughtError: Error | undefined;
    const handleError = (event: ErrorEvent) => {
      caughtError = event.error;
      event.preventDefault();
    };
    window.addEventListener("error", handleError);

    try {
      view.dom.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      view.dom.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

      expect(view.state.doc.firstChild?.type.name).toBe("paragraph");
      expect(view.state.selection.$from.doc).toBe(view.state.doc);
      expect(caughtError).toBeUndefined();
    } finally {
      window.removeEventListener("error", handleError);
      view.destroy();
      container.remove();
    }
  });
});
