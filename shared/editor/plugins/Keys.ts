import { GapCursor } from "prosemirror-gapcursor";
import {
  Plugin,
  Selection,
  AllSelection,
  TextSelection,
} from "prosemirror-state";
import Extension from "../lib/Extension";
import isModKey from "../lib/isModKey";

export default class Keys extends Extension {
  get name() {
    return "keys";
  }

  get plugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            blur: this.options.onBlur,
            focus: this.options.onFocus,
          },
          // we can't use the keys bindings for this as we want to preventDefault
          // on the original keyboard event when handled
          handleKeyDown: (view, event) => {
            if (view.state.selection instanceof AllSelection) {
              if (event.key === "ArrowUp") {
                const selection = Selection.atStart(view.state.doc);
                view.dispatch(view.state.tr.setSelection(selection));
                return true;
              }
              if (event.key === "ArrowDown") {
                const selection = Selection.atEnd(view.state.doc);
                view.dispatch(view.state.tr.setSelection(selection));
                return true;
              }
            }

            // edge case where horizontal gap cursor does nothing if Enter key
            // is pressed. Insert a newline and then move the cursor into it.
            if (view.state.selection instanceof GapCursor) {
              if (event.key === "Enter") {
                view.dispatch(
                  view.state.tr.insert(
                    view.state.selection.from,
                    view.state.schema.nodes.paragraph.create({})
                  )
                );
                view.dispatch(
                  view.state.tr.setSelection(
                    TextSelection.near(
                      view.state.doc.resolve(view.state.selection.from),
                      -1
                    )
                  )
                );
                return true;
              }
            }

            // All the following keys require mod to be down
            if (!isModKey(event)) {
              return false;
            }

            if (event.key === "s") {
              event.preventDefault();
              this.options.onSave();
              return true;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              this.options.onSaveAndExit();
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              this.options.onCancel();
              return true;
            }

            return false;
          },
        },
      }),
    ];
  }
}
