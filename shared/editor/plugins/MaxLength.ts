import { Plugin, Transaction } from "prosemirror-state";
import Extension from "../lib/Extension";

export default class MaxLength extends Extension {
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
