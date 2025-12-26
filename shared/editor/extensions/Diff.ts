import { observable } from "mobx";
import type { Command } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node } from "prosemirror-model";
import { DOMSerializer, Fragment } from "prosemirror-model";
import scrollIntoView from "scroll-into-view-if-needed";
import Extension from "../lib/Extension";
import type { Change } from "prosemirror-changeset";

const pluginKey = new PluginKey("diffs");

export default class Diff extends Extension {
  get name() {
    return "diff";
  }

  get defaultOptions() {
    return {
      changes: null,
      insertionClassName: "diff-insertion",
      deletionClassName: "diff-deletion",
      currentChangeClassName: "current-diff",
    };
  }

  public commands() {
    return {
      /**
       * Navigate to the next change in the document.
       */
      nextChange: () => this.goToChange(1),

      /**
       * Navigate to the previous change in the document.
       */
      prevChange: () => this.goToChange(-1),
    };
  }

  private goToChange(direction: number): Command {
    return (state, dispatch) => {
      const { changes } = this.options as { changes: Change[] | null };

      if (!changes || changes.length === 0) {
        return false;
      }

      if (direction > 0) {
        if (this.currentChangeIndex >= changes.length - 1) {
          this.currentChangeIndex = 0;
        } else {
          this.currentChangeIndex += 1;
        }
      } else {
        if (this.currentChangeIndex === 0) {
          this.currentChangeIndex = changes.length - 1;
        } else {
          this.currentChangeIndex -= 1;
        }
      }

      dispatch?.(state.tr.setMeta(pluginKey, {}));

      const element = window.document.querySelector(
        `.${this.options.currentChangeClassName}`
      );
      if (element) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          block: "center",
        });
      }
      return true;
    };
  }

  get allowInReadOnly(): boolean {
    return true;
  }

  get plugins() {
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr) => this.createDecorations(tr.doc),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        // Allow meta transactions to bypass filtering
        filterTransaction: (tr) =>
          tr.getMeta("codeHighlighting") || tr.getMeta(pluginKey)
            ? true
            : false,
      }),
    ];
  }

  private createDecorations(doc: Node) {
    const { changes } = this.options as { changes: Change[] | null };
    const decorations: Decoration[] = [];

    // Add insertion and deletion decorations
    changes?.forEach((change, changeIndex) => {
      let start = change.fromB;
      let end = start;
      const isCurrent = changeIndex === this.currentChangeIndex;

      change.inserted.forEach((insertion) => {
        end = start + insertion.length;

        decorations.push(
          Decoration.inline(start, end, {
            class: `${this.options.insertionClassName}${
              isCurrent ? ` ${this.options.currentChangeClassName}` : ""
            }`,
          })
        );
      });

      change.deleted.forEach((deletion) => {
        // For deletions, we create a widget decoration that shows
        // the deleted text in a special way.
        const dom = document.createElement("span");
        dom.setAttribute(
          "class",
          `${this.options.deletionClassName}${
            isCurrent ? ` ${this.options.currentChangeClassName}` : ""
          }`
        );

        if (!deletion.data.slice) {
          return;
        }

        const $pos = doc.resolve(start);
        const isInCode = !!$pos.parent.type.spec.code;

        // Add a debug class to verify this code is being executed
        dom.classList.add("diff-debug-marker");

        /**
         * Recursively unwrap nodes that are redundant or invalid given the
         * current context.
         */
        const unwrap = (fragment: Fragment): Node[] => {
          const result: Node[] = [];
          fragment.forEach((node: Node) => {
            if (node.isBlock && (isInCode || $pos.parent.type.inlineContent)) {
              result.push(...unwrap(node.content));
            } else {
              result.push(node);
            }
          });
          return result;
        };

        const fragment = Fragment.from(unwrap(deletion.data.slice.content));

        dom.appendChild(
          DOMSerializer.fromSchema(doc.type.schema).serializeFragment(fragment)
        );

        decorations.push(
          Decoration.widget(start, () => dom, {
            side: -1,
          })
        );
      });
    });

    return DecorationSet.create(doc, decorations);
  }

  @observable
  private currentChangeIndex = -1;
}
