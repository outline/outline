import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import Extension from "../lib/Extension";

/** Zero-width no-break space used as a caret anchor around inline atoms. */
export const ZERO_WIDTH_SPACER = "\uFEFF";

/**
 * Strips all generated caret anchors from a string.
 *
 * @param text The input string.
 * @returns The string without caret anchors.
 */
export function stripZeroWidthSpacers(text: string): string {
  return text.replace(/\uFEFF/g, "");
}

/**
 * Strips generated caret anchors from a ProseMirror fragment.
 *
 * @param fragment The fragment to sanitize.
 * @returns A copy without caret anchors.
 */
export function stripSpacersFromFragment(fragment: Fragment): Fragment {
  const children: ProsemirrorNode[] = [];

  fragment.forEach((child) => {
    if (child.isText && child.text) {
      const text = stripZeroWidthSpacers(child.text);
      if (text) {
        children.push(child.type.schema.text(text, child.marks));
      }
      return;
    }

    children.push(
      child.content.size
        ? child.copy(stripSpacersFromFragment(child.content))
        : child
    );
  });

  return Fragment.from(children);
}

/**
 * Strips generated caret anchors from a ProseMirror document.
 *
 * @param node The document node to sanitize.
 * @returns A copy without caret anchors.
 */
export function stripSpacersFromNode(node: ProsemirrorNode): ProsemirrorNode {
  return node.copy(stripSpacersFromFragment(node.content));
}

/**
 * Returns the resolved cursor position for a collapsed text selection.
 *
 * @param state The editor state to inspect.
 * @returns The cursor position, or undefined when the selection is not a cursor.
 */
export function textCursor(state: EditorState): ResolvedPos | undefined {
  const { selection } = state;
  return selection instanceof TextSelection
    ? (selection.$cursor ?? undefined)
    : undefined;
}

/**
 * Returns the position of the inline atom immediately before a cursor.
 *
 * @param cursor The cursor position to inspect.
 * @returns The atom position, or undefined when no adjacent atom exists.
 */
export function atomBefore(cursor: ResolvedPos): number | undefined {
  const nodeBefore = cursor.nodeBefore;
  if (!nodeBefore) {
    return undefined;
  }
  if (isInlineAtom(nodeBefore)) {
    return cursor.pos - nodeBefore.nodeSize;
  }
  if (!isSpacer(nodeBefore)) {
    return undefined;
  }

  const beforeSpacer = cursor.pos - nodeBefore.nodeSize;
  const atom = cursor.doc.resolve(beforeSpacer).nodeBefore;
  return atom && isInlineAtom(atom) ? beforeSpacer - atom.nodeSize : undefined;
}

/**
 * Returns the position of the inline atom immediately after a cursor.
 *
 * @param cursor The cursor position to inspect.
 * @returns The atom position, or undefined when no adjacent atom exists.
 */
export function atomAfter(cursor: ResolvedPos): number | undefined {
  const nodeAfter = cursor.nodeAfter;
  if (!nodeAfter) {
    return undefined;
  }
  if (isInlineAtom(nodeAfter)) {
    return cursor.pos;
  }
  if (!isSpacer(nodeAfter)) {
    return undefined;
  }

  const afterSpacer = cursor.pos + nodeAfter.nodeSize;
  return isInlineAtom(cursor.doc.resolve(afterSpacer).nodeAfter)
    ? afterSpacer
    : undefined;
}

/**
 * Splits the current block and places the cursor in the new block.
 *
 * @param state The editor state to split.
 * @param dispatch The transaction dispatcher.
 * @param pos The document position at which to split.
 * @returns Whether the command handled the event.
 */
export function splitAt(
  state: EditorState,
  dispatch: Parameters<Command>[1],
  pos: number
): boolean {
  if (dispatch) {
    const transaction = state.tr.split(pos);
    transaction.setSelection(
      TextSelection.near(transaction.doc.resolve(pos + 1), 1)
    );
    dispatch(transaction.scrollIntoView());
  }
  return true;
}

/**
 * Determines whether a node is a non-text inline atom.
 *
 * @param node The node to inspect.
 * @returns Whether the node is an inline atom.
 */
export function isInlineAtom(
  node: ProsemirrorNode | null | undefined
): boolean {
  return !!node?.isInline && node.type.spec.atom === true && !node.isText;
}

/**
 * Determines whether a node contains only generated caret anchors.
 *
 * @param node The node to inspect.
 * @returns Whether the node is a spacer text node.
 */
export function isSpacer(node: ProsemirrorNode | null | undefined): boolean {
  return !!node?.isText && !!node.text && !stripZeroWidthSpacers(node.text);
}

type NormalizationOp =
  | { type: "delete"; from: number; to: number }
  | { type: "insert"; pos: number; text: string };

/** Maintains editable text anchors around inline atom nodes. */
export default class InlineAtomSpacer extends Extension {
  get name() {
    return "inlineAtomSpacer";
  }

  get plugins(): Plugin[] {
    const key = new PluginKey("inlineAtomSpacer");
    let editorView: EditorView | null = null;

    return [
      new Plugin({
        key,
        view: (view) => {
          editorView = view;
          view.dispatch(view.state.tr.setMeta(key, true));
          return {
            destroy: () => {
              editorView = null;
            },
          };
        },
        props: {
          handleDOMEvents: {
            compositionend: (view) => {
              setTimeout(() => {
                if (!view.isDestroyed && !view.composing) {
                  view.dispatch(view.state.tr.setMeta(key, true));
                }
              }, 0);
              return false;
            },
          },
          transformCopied: (slice) =>
            new Slice(
              stripSpacersFromFragment(slice.content),
              slice.openStart,
              slice.openEnd
            ),
        },
        appendTransaction: (transactions, _oldState, newState) => {
          if (editorView?.composing) {
            return null;
          }

          if (
            !transactions.some(
              (transaction) =>
                transaction.docChanged || transaction.getMeta(key)
            )
          ) {
            return null;
          }

          const ops: NormalizationOp[] = [];
          const addInsert = (pos: number) => {
            if (!ops.some((op) => op.type === "insert" && op.pos === pos)) {
              ops.push({ type: "insert", pos, text: ZERO_WIDTH_SPACER });
            }
          };

          // ponytail: scan the full document until profiling shows a need to
          // restrict normalization to changed ranges in very large documents.
          newState.doc.descendants((node, pos) => {
            if (!node.isBlock || !node.inlineContent) {
              return true;
            }

            let hasInlineAtom = false;
            for (let i = 0; i < node.childCount; i++) {
              if (isInlineAtom(node.child(i))) {
                hasInlineAtom = true;
                break;
              }
            }

            let offset = pos + 1;
            if (!hasInlineAtom) {
              // If there are no inline atoms, any zero-width spacer in this block is an orphan.
              for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (
                  child.isText &&
                  child.text &&
                  child.text.includes(ZERO_WIDTH_SPACER)
                ) {
                  if (isSpacer(child)) {
                    ops.push({
                      type: "delete",
                      from: offset,
                      to: offset + child.nodeSize,
                    });
                  } else {
                    for (let j = 0; j < child.text.length; j++) {
                      if (child.text[j] === ZERO_WIDTH_SPACER) {
                        ops.push({
                          type: "delete",
                          from: offset + j,
                          to: offset + j + 1,
                        });
                      }
                    }
                  }
                }
                offset += child.nodeSize;
              }
              return false;
            }

            // The block has inline atoms. Ensure each atom has an adjacent text node
            // and delete any orphan pure spacers not adjacent to any atom.
            for (let i = 0; i < node.childCount; i++) {
              const child = node.child(i);
              const prevChild = i > 0 ? node.child(i - 1) : null;
              const nextChild =
                i < node.childCount - 1 ? node.child(i + 1) : null;

              if (isInlineAtom(child)) {
                if (!prevChild || !prevChild.isText) {
                  addInsert(offset);
                }
                if (!nextChild || !nextChild.isText) {
                  addInsert(offset + child.nodeSize);
                }
              } else if (isSpacer(child)) {
                const isAdjacentToAtom =
                  isInlineAtom(prevChild) || isInlineAtom(nextChild);
                if (!isAdjacentToAtom) {
                  ops.push({
                    type: "delete",
                    from: offset,
                    to: offset + child.nodeSize,
                  });
                } else if (child.text && child.text.length > 1) {
                  // Collapse multiple consecutive zero-width spacers in a pure spacer node
                  ops.push({
                    type: "delete",
                    from: offset + 1,
                    to: offset + child.nodeSize,
                  });
                }
              }

              offset += child.nodeSize;
            }

            return false;
          });

          if (!ops.length) {
            return null;
          }

          // Sort operations descending by position so applying them does not invalidate earlier offsets
          ops.sort((a, b) => {
            const posA = a.type === "delete" ? a.from : a.pos;
            const posB = b.type === "delete" ? b.from : b.pos;
            if (posB !== posA) {
              return posB - posA;
            }
            return a.type === "delete" ? -1 : 1;
          });

          const transaction = newState.tr;
          for (const op of ops) {
            if (op.type === "delete") {
              transaction.delete(op.from, op.to);
            } else {
              transaction.insertText(op.text, op.pos);
            }
          }

          return transaction;
        },
      }),
    ];
  }

  keys(): Record<string, Command> {
    return {
      Backspace: (state, dispatch) => {
        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        const textBefore = cursor.nodeBefore?.text ?? "";
        const cleanBefore = stripZeroWidthSpacers(textBefore);
        if (
          cursor.nodeBefore?.isText &&
          cleanBefore.length === 1 &&
          isInlineAtom(cursor.nodeAfter)
        ) {
          dispatch?.(
            state.tr.delete(cursor.pos - 1, cursor.pos).scrollIntoView()
          );
          return true;
        }

        const atomPos = atomBefore(cursor);
        if (atomPos === undefined) {
          return false;
        }
        dispatch?.(
          state.tr.setSelection(NodeSelection.create(state.doc, atomPos))
        );
        return true;
      },
      Delete: (state, dispatch) => {
        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        const nodeAfter = cursor.nodeAfter;
        const textAfter = nodeAfter?.text ?? "";
        const cleanAfter = stripZeroWidthSpacers(textAfter);
        if (nodeAfter?.isText && cleanAfter.length === 1) {
          const afterText = state.doc.resolve(cursor.pos + nodeAfter.nodeSize);
          if (isInlineAtom(afterText.nodeAfter)) {
            dispatch?.(
              state.tr.delete(cursor.pos, cursor.pos + 1).scrollIntoView()
            );
            return true;
          }
        }

        const atomPos = atomAfter(cursor);
        if (atomPos === undefined) {
          return false;
        }
        dispatch?.(
          state.tr.setSelection(NodeSelection.create(state.doc, atomPos))
        );
        return true;
      },
    };
  }
}
