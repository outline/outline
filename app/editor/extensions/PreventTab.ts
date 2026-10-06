import type { Command } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import type { Props as EditorProps } from "~/editor";

export default class PreventTab extends Extension {
  get name() {
    return "preventTab";
  }

  keys(): Record<string, Command> {
    return {
      // No-ops prevent Tab escaping the editor bounds, except Shift-Tab at the
      // very start of the document when a preceding input is registered.
      Tab: () => true,
      "Shift-Tab": (state) => {
        const { onShiftTabAtStart } = this.editor.props as EditorProps;
        const { selection } = state;
        const $pos = state.doc.resolve(selection.from);
        if (
          onShiftTabAtStart &&
          selection.empty &&
          $pos.parentOffset === 0 &&
          $pos.depth <= 1 &&
          $pos.index(0) === 0
        ) {
          onShiftTabAtStart();
        }
        return true;
      },
    };
  }
}
