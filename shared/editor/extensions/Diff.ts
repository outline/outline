import { observable } from "mobx";
import type { Command } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { Node, ResolvedPos } from "prosemirror-model";
import { DOMSerializer, Fragment } from "prosemirror-model";
import scrollIntoView from "scroll-into-view-if-needed";
import Extension from "../lib/Extension";
import type { ExtendedChange } from "../lib/ChangesetHelper";
import { cn } from "../styles/utils";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

const pluginKey = new PluginKey("diffs");

export default class Diff extends Extension {
  get name() {
    return "diff";
  }

  get defaultOptions() {
    return {
      changes: null,
      insertionClassName: EditorStyleHelper.diffInsertion,
      deletionClassName: EditorStyleHelper.diffDeletion,
      nodeInsertionClassName: EditorStyleHelper.diffNodeInsertion,
      nodeDeletionClassName: EditorStyleHelper.diffNodeDeletion,
      modificationClassName: EditorStyleHelper.diffModification,
      nodeModificationClassName: EditorStyleHelper.diffNodeModification,
      currentChangeClassName: EditorStyleHelper.diffCurrentChange,
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
      const { changes } = this.options as { changes: ExtendedChange[] | null };

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
    const { changes } = this.options as { changes: ExtendedChange[] | null };
    const decorations: Decoration[] = [];

    /**
     * Determines if a slice should use node decoration instead of inline decoration.
     */
    const shouldUseNodeDecoration = (
      slice:
        | { content: { childCount: number; firstChild: Node | null } }
        | null
        | undefined
    ): boolean => {
      if (slice?.content.childCount === 1) {
        const node = slice.content.firstChild;
        if (
          node &&
          !node.isText &&
          ((node.isBlock && node.type.name !== "paragraph") ||
            (node.isInline && node.isAtom))
        ) {
          return true;
        }
      }
      return false;
    };

    /**
     * Adds the appropriate decoration for a change.
     */
    const addChangeDecoration = (
      pos: number,
      end: number,
      className: string,
      useNodeDecoration: boolean
    ): void => {
      if (useNodeDecoration) {
        decorations.push(
          Decoration.node(pos, end, {
            class: className,
          })
        );
      } else {
        decorations.push(
          Decoration.inline(pos, end, {
            class: className,
          })
        );
      }
    };

    /**
     * Recursively unwrap nodes that are redundant or invalid given the
     * current context.
     */
    const unwrap = ($pos: ResolvedPos, fragment: Fragment): Node[] => {
      const result: Node[] = [];
      fragment.forEach((node: Node) => {
        let isRedundant = false;

        for (let d = 0; d <= $pos.depth; d++) {
          const ancestor = $pos.node(d);
          const ancestorRole = ancestor.type.spec.tableRole;
          const nodeRole = node.type.spec.tableRole;

          if (
            ancestor.type.name === node.type.name ||
            (ancestorRole === "row" &&
              (nodeRole === "cell" || nodeRole === "header_cell")) ||
            (ancestorRole === "table" && nodeRole === "row")
          ) {
            isRedundant = true;
            break;
          }
        }

        if (node.isBlock && (isRedundant || $pos.parent.type.inlineContent)) {
          result.push(...unwrap($pos, node.content));
        } else {
          result.push(node);
        }
      });
      return result;
    };

    // Add insertion, deletion, and modification decorations
    changes?.forEach((change, changeIndex) => {
      let pos = change.fromB;
      const isCurrent = changeIndex === this.currentChangeIndex;

      change.inserted.forEach((insertion) => {
        const end = pos + insertion.length;
        const useNodeDecoration = shouldUseNodeDecoration(
          insertion.data.step.slice
        );

        const className = cn({
          [this.options.currentChangeClassName]: isCurrent,
          [this.options.insertionClassName]: !useNodeDecoration,
          [this.options.nodeInsertionClassName]: useNodeDecoration,
        });

        addChangeDecoration(pos, end, className, useNodeDecoration);
        pos = end;
      });

      change.deleted.forEach((deletion) => {
        if (!deletion.data.slice) {
          return;
        }

        const $pos = doc.resolve(change.fromB);
        const parentRole = $pos.parent.type.spec.tableRole;
        const parentGroup = $pos.parent.type.spec.group;
        let tag = $pos.parent.type.inlineContent ? "span" : "div";

        if (parentRole === "table") {
          tag = "tr";
        } else if (parentRole === "row") {
          tag = "td";
        } else if (parentGroup?.includes("list")) {
          tag = "li";
        }

        const useNodeDecoration = shouldUseNodeDecoration(deletion.data.slice);

        // Check if we're deleting a single paragraph - if so, use <p> tag
        // and unwrap the paragraph content to avoid nested <p> tags
        let contentToSerialize = deletion.data.slice.content;
        if (deletion.data.slice.content.childCount === 1) {
          const deletedNode = deletion.data.slice.content.firstChild;
          if (deletedNode?.type.name === "paragraph") {
            tag = "p";
            // Unwrap the paragraph to get just its inline content
            contentToSerialize = deletedNode.content;
          }
        }

        const dom = document.createElement(tag);
        dom.setAttribute(
          "class",
          cn({
            [this.options.currentChangeClassName]: isCurrent,
            [this.options.deletionClassName]: !useNodeDecoration,
            [this.options.nodeDeletionClassName]: useNodeDecoration,
          })
        );

        const fragment = Fragment.from(unwrap($pos, contentToSerialize));

        dom.appendChild(
          DOMSerializer.fromSchema(doc.type.schema).serializeFragment(fragment)
        );

        decorations.push(
          Decoration.widget(change.fromB, () => dom, {
            side: -1,
          })
        );
      });

      // Add modification decorations
      change.modified.forEach((modification) => {
        const end = pos + modification.length;
        const useNodeDecoration = shouldUseNodeDecoration(
          modification.data.slice
        );

        const className = cn({
          [this.options.currentChangeClassName]: isCurrent,
          [this.options.modificationClassName]: !useNodeDecoration,
          [this.options.nodeModificationClassName]: useNodeDecoration,
        });

        addChangeDecoration(pos, end, className, useNodeDecoration);
        pos = end;
      });
    });

    return DecorationSet.create(doc, decorations);
  }

  @observable
  private currentChangeIndex = -1;
}
