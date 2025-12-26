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
      let pos = change.fromB;
      const isCurrent = changeIndex === this.currentChangeIndex;

      change.inserted.forEach((insertion) => {
        const end = pos + insertion.length;

        decorations.push(
          Decoration.inline(pos, end, {
            class: `${this.options.insertionClassName}${
              isCurrent ? ` ${this.options.currentChangeClassName}` : ""
            }`,
          })
        );
        pos = end;
      });

      change.deleted.forEach((deletion) => {
        if (!deletion.data.slice) {
          return;
        }

        const $pos = doc.resolve(change.fromB);
        const parentRole = $pos.parent.type.spec.tableRole;
        let tag = $pos.parent.type.inlineContent ? "span" : "div";

        if (parentRole === "table") {
          tag = "tr";
        } else if (parentRole === "row") {
          tag = "td";
        }

        const dom = document.createElement(tag);
        dom.setAttribute(
          "class",
          `${this.options.deletionClassName}${
            isCurrent ? ` ${this.options.currentChangeClassName}` : ""
          }`
        );

        /**
         * Recursively unwrap nodes that are redundant or invalid given the
         * current context.
         */
        const unwrap = (fragment: Fragment): Node[] => {
          const result: Node[] = [];
          fragment.forEach((node: Node) => {
            let isRedundant = false;

            for (let d = 0; d <= $pos.depth; d++) {
              const ancestor = $pos.node(d);
              const ancestorRole = ancestor.type.spec.tableRole;
              const nodeRole = node.type.spec.tableRole;

              if (
                ancestor.type.name === node.type.name ||
                (ancestor.type.spec.code && node.type.spec.code) ||
                (ancestorRole === "row" &&
                  (nodeRole === "cell" || nodeRole === "header_cell")) ||
                (ancestorRole === "table" && nodeRole === "row")
              ) {
                isRedundant = true;
                break;
              }
            }

            if (
              node.isBlock &&
              (isRedundant || $pos.parent.type.inlineContent)
            ) {
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
          Decoration.widget(change.fromB, () => dom, {
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
