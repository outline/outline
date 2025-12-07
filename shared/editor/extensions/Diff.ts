import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { DOMSerializer } from "prosemirror-model";
import { type ChangeSet } from "prosemirror-changeset";
import Extension from "../lib/Extension";
import { type ProsemirrorData } from "../../types";

export type DiffChanges = {
  inserted: ChangeSet["inserted"];
  deleted: ChangeSet["deleted"];
  data: ProsemirrorData;
};

export default class Diff extends Extension {
  get name() {
    return "diff";
  }

  get defaultOptions() {
    return {
      changes: null,
    };
  }

  get allowInReadOnly(): boolean {
    return true;
  }

  get plugins() {
    const { changes } = this.options as { changes: DiffChanges | null };

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
            changes.inserted.forEach((insertion) => {
              decorations.push(
                Decoration.inline(insertion.from, insertion.to, {
                  class: "diff-insertion",
                })
              );
            });

            // Add deletion decorations using widgets
            changes.deleted.forEach((deletion) => {
              const dom = document.createElement("span");
              dom.setAttribute("class", "diff-deletion");
              dom.appendChild(
                DOMSerializer.fromSchema(state.schema).serializeFragment(
                  deletion.slice.content
                )
              );
              decorations.push(
                Decoration.widget(deletion.pos, dom, { marks: [] })
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
