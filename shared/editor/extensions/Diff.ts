import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "../lib/Extension";

export type DiffChange = {
  from: number;
  to: number;
};

export type DiffChanges = {
  inserted: DiffChange[];
  deleted: DiffChange[];
};

export default class Diff extends Extension {
  get name() {
    return "diff";
  }

  get defaultOptions() {
    return {
      changes: null as DiffChanges | null,
    };
  }

  get allowInReadOnly(): boolean {
    return true;
  }

  get plugins() {
    const { changes } = this.options;

    if (!changes) {
      return [];
    }

    return [
      new Plugin({
        key: new PluginKey("diffs"),
        props: {
          decorations: (state) => {
            let decorations: Decoration[] = [];

            // Add insertion decorations
            changes.inserted.forEach((insertion: DiffChange) => {
              decorations.push(
                Decoration.inline(insertion.from, insertion.to, {
                  class: "diff-insertion",
                })
              );
            });

            // Add deletion decorations
            changes.deleted.forEach((deletion: DiffChange) => {
              decorations.push(
                Decoration.inline(deletion.from, deletion.to, {
                  nodeName: "del",
                  class: "diff-deletion",
                })
              );
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
        filterTransaction: () => false,
      }),
    ];
  }
}
