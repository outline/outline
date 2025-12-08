import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { DOMSerializer } from "prosemirror-model";
import Extension from "../lib/Extension";
import { Change } from "prosemirror-changeset";

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
    const { changes } = this.options as { changes: Change[] | null };

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
            changes.forEach((change) => {
              let start = change.fromB;
              let end = start;
              change.inserted.forEach((insertion) => {
                end = start + insertion.length;

                decorations.push(
                  Decoration.inline(start, end, {
                    class: "diff-insertion",
                  })
                );
              });

              change.deleted.forEach((deletion) => {
                // For deletions, we create a widget decoration that shows
                // the deleted text in a special way.
                const dom = document.createElement("span");
                dom.setAttribute("class", "diff-deletion");
                dom.appendChild(
                  DOMSerializer.fromSchema(state.schema).serializeFragment(
                    deletion.data.slice.content
                  )
                );

                decorations.push(
                  Decoration.widget(start, () => dom, {
                    side: -1,
                  })
                );
              });
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
        // Allow meta transactions to bypass filtering
        filterTransaction: (tr) => !!tr.getMeta("codeHighlighting"),
      }),
    ];
  }
}
