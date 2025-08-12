import { Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";

export default class UpArrowAtStart extends Extension {
  get name() {
    return "upArrowAtStart";
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
            // Only handle up arrow key
            if (event.key !== "ArrowUp") {
              return false;
            }

            const { state } = view;
            const { selection } = state;

            // Check if cursor is at the very beginning of the document
            // and it's an empty selection (cursor, not text selection)
            if (selection.empty && selection.from <= 1) {
              // Also check if we're at the start of the first text node
              const $pos = state.doc.resolve(selection.from);
              const isAtDocStart = $pos.parentOffset === 0 && $pos.depth <= 1;

              if (isAtDocStart) {
                // Call the onUpArrowAtStart callback if it exists
                // Cast to any to access the custom prop since it's not in the base Props type
                const props = this.editor.props as any;
                if (props.onUpArrowAtStart) {
                  props.onUpArrowAtStart();
                  return true;
                }
              }
            }

            return false;
          },
        },
      }),
    ];
  }
}
