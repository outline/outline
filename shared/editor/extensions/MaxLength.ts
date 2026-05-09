import type { Transaction } from "prosemirror-state";
import { Plugin } from "prosemirror-state";
import Extension from "../lib/Extension";

/**
 * Options for the MaxLength extension.
 */
type MaxLengthOptions = {
  /** Maximum allowed document size, in ProseMirror node size units. */
  maxLength?: number;
};

export default class MaxLength extends Extension<MaxLengthOptions> {
  get name() {
    return "maxlength";
  }

  get plugins() {
    return [
      new Plugin({
        filterTransaction: (tr: Transaction) => {
          if (this.options.maxLength) {
            const result = tr.doc && tr.doc.nodeSize > this.options.maxLength;
            return !result;
          }

          return true;
        },
      }),
    ];
  }
}
