import type { Node as ProsemirrorNode, ResolvedPos } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import {
  NodeSelection,
  Plugin,
  Selection,
  TextSelection,
} from "prosemirror-state";
import { isInTable } from "prosemirror-tables";
import Extension from "../lib/Extension";
import {
  atomAfter,
  atomBefore,
  isInlineAtom,
  isSpacer,
  splitAt,
  stripZeroWidthSpacers,
  textCursor,
} from "./InlineAtomSpacer";

/** Handles image-specific keyboard and pointer behavior inside table cells. */
export default class TableCellInteraction extends Extension {
  get name() {
    return "tableCellInteraction";
  }

  get plugins(): Plugin[] {
    return [
      new Plugin({
        props: {
          handleClickOn: (view, _pos, node, nodePos, event) => {
            if (!isTableCell(node)) {
              return false;
            }

            const target = event.target;
            const cell =
              target instanceof Element ? target.closest("td, th") : null;
            const cellNode = view.nodeDOM(nodePos);
            if (!(cell instanceof HTMLElement) || cell !== cellNode) {
              return false;
            }

            const componentImages = Array.from(
              cell.querySelectorAll<HTMLElement>(".component-image")
            );
            const images = componentImages.length
              ? componentImages
              : Array.from(cell.querySelectorAll<HTMLElement>(".image"));
            if (!images.length) {
              return false;
            }
            // If the user clicked directly on real text inside the cell, do not intercept
            // so ProseMirror's default text positioning can place the cursor precisely between characters.
            let coords: ReturnType<typeof view.posAtCoords> = null;
            try {
              coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
            } catch {
              // posAtCoords may fail in test/jsdom environments without full DOM layout
            }
            if (coords) {
              const $pos = view.state.doc.resolve(coords.pos);
              const textBefore = $pos.nodeBefore?.isText
                ? stripZeroWidthSpacers($pos.nodeBefore.text ?? "")
                : "";
              const textAfter = $pos.nodeAfter?.isText
                ? stripZeroWidthSpacers($pos.nodeAfter.text ?? "")
                : "";
              if (textBefore.length > 0 || textAfter.length > 0) {
                return false;
              }
            }

            let clickSide: "left" | "right" | null = null;
            const imageIndex = images.findIndex((element) => {
              const visibleImage =
                element.querySelector<HTMLElement>(".image-wrapper") ??
                element.querySelector<HTMLElement>("img") ??
                element;
              const rect = visibleImage.getBoundingClientRect();
              if (event.clientY >= rect.top && event.clientY <= rect.bottom) {
                if (event.clientX > rect.right) {
                  clickSide = "right";
                  return true;
                }
                if (event.clientX < rect.left) {
                  clickSide = "left";
                  return true;
                }
              }
              return false;
            });

            if (imageIndex !== -1 && clickSide) {
              const atomPos = imagePositions(node, nodePos)[imageIndex];
              if (atomPos === undefined) {
                return false;
              }
              const atom = view.state.doc.nodeAt(atomPos);
              if (!atom) {
                return false;
              }
              let targetPos: number;
              let bias: number;
              if (clickSide === "left") {
                targetPos = atomPos;
                bias = -1;
              } else {
                const nextNode = view.state.doc.nodeAt(atomPos + atom.nodeSize);
                targetPos =
                  atomPos +
                  atom.nodeSize +
                  (nextNode && isSpacer(nextNode) ? nextNode.nodeSize : 0);
                bias = 1;
              }
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.near(view.state.doc.resolve(targetPos), bias)
                )
              );
              view.focus();
              return true;
            }

            const lastContent = cell.lastElementChild;
            if (
              !lastContent ||
              event.clientY <= lastContent.getBoundingClientRect().bottom
            ) {
              return false;
            }

            const insertPos = nodePos + node.nodeSize - 1;
            const transaction = view.state.tr.insert(
              insertPos,
              view.state.schema.nodes.paragraph.create()
            );
            transaction.setSelection(
              TextSelection.near(transaction.doc.resolve(insertPos + 1), 1)
            );
            view.dispatch(transaction.scrollIntoView());
            view.focus();
            return true;
          },
        },
      }),
    ];
  }

  keys(): Record<string, Command> {
    return {
      Enter: (state, dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          selection.node.type.name === "image"
        ) {
          return splitAt(state, dispatch, selection.to);
        }

        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }
        const atomPos = atomBefore(cursor);
        return atomPos !== undefined &&
          state.doc.nodeAt(atomPos)?.type.name === "image"
          ? splitAt(state, dispatch, cursor.pos)
          : false;
      },
      ArrowRight: (state, dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          isInlineAtom(selection.node)
        ) {
          const $to = selection.$to;
          if ($to.nodeAfter && isSpacer($to.nodeAfter)) {
            const pos = $to.pos + $to.nodeAfter.nodeSize;
            dispatch?.(
              state.tr
                .setSelection(TextSelection.create(state.doc, pos))
                .scrollIntoView()
            );
            return true;
          }
          const sel = Selection.findFrom($to, 1, true);
          if (sel) {
            dispatch?.(state.tr.setSelection(sel).scrollIntoView());
            return true;
          }
        }

        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        const atomPos = atomAfter(cursor);
        if (atomPos !== undefined) {
          dispatch?.(
            state.tr.setSelection(NodeSelection.create(state.doc, atomPos))
          );
          return true;
        }

        return false;
      },
      ArrowLeft: (state, dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        const { selection } = state;
        if (
          selection instanceof NodeSelection &&
          isInlineAtom(selection.node)
        ) {
          const $from = selection.$from;
          const pos = $from.pos;
          dispatch?.(
            state.tr
              .setSelection(TextSelection.create(state.doc, pos))
              .scrollIntoView()
          );
          return true;
        }

        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        const atomPos = atomBefore(cursor);
        if (atomPos !== undefined) {
          dispatch?.(
            state.tr.setSelection(NodeSelection.create(state.doc, atomPos))
          );
          return true;
        }

        return false;
      },
      Backspace: (state, dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        if (deleteEmptyParagraph(state, dispatch, cursor)) {
          return true;
        }

        // 2. Cursor is at the start of a paragraph (or immediately before an image/spacer), and preceding sibling is an empty paragraph
        if (isTableCell(cursor.node(-1)) && cursor.index(-1) > 0) {
          const isAtStart =
            cursor.pos === cursor.start() ||
            (cursor.parent.firstChild &&
              isSpacer(cursor.parent.firstChild) &&
              cursor.pos <= cursor.start() + cursor.parent.firstChild.nodeSize);
          if (isAtStart) {
            const prevSibling = cursor.node(-1).child(cursor.index(-1) - 1);
            if (isEmptyParagraph(prevSibling)) {
              const prevBlockStart = cursor.before() - prevSibling.nodeSize;
              dispatch?.(
                state.tr
                  .delete(prevBlockStart, cursor.before())
                  .scrollIntoView()
              );
              return true;
            }
          }
        }

        return false;
      },
      Delete: (state, dispatch) => {
        if (!isInTable(state)) {
          return false;
        }

        const cursor = textCursor(state);
        if (!cursor) {
          return false;
        }

        if (deleteEmptyParagraph(state, dispatch, cursor, 1)) {
          return true;
        }

        return false;
      },
    };
  }
}

function deleteEmptyParagraph(
  state: Parameters<Command>[0],
  dispatch: Parameters<Command>[1],
  cursor: ResolvedPos,
  bias = cursor.index(-1) === 0 ? 1 : -1
): boolean {
  if (
    !isEmptyParagraph(cursor.parent) ||
    !isTableCell(cursor.node(-1)) ||
    cursor.node(-1).childCount <= 1
  ) {
    return false;
  }

  const from = cursor.before();
  const tr = state.tr.delete(from, cursor.after());
  const $pos = tr.doc.resolve(Math.min(from, tr.doc.content.size - 1));
  const selection =
    Selection.findFrom($pos, bias, true) ??
    Selection.findFrom($pos, -bias, true);
  if (selection) {
    tr.setSelection(selection);
  }
  dispatch?.(tr.scrollIntoView());
  return true;
}

function imagePositions(node: ProsemirrorNode, nodePos: number): number[] {
  const positions: number[] = [];
  node.descendants((child, pos) => {
    if (child.type.name === "image") {
      positions.push(nodePos + pos + 1);
    }
    return true;
  });
  return positions;
}

function isTableCell(node: ProsemirrorNode): boolean {
  return (
    node.type.spec.tableRole === "cell" ||
    node.type.spec.tableRole === "header_cell"
  );
}

function isEmptyParagraph(node: ProsemirrorNode): boolean {
  if (node.type.name !== "paragraph") {
    return false;
  }
  if (node.content.size === 0) {
    return true;
  }
  for (let i = 0; i < node.childCount; i++) {
    if (isInlineAtom(node.child(i))) {
      return false;
    }
  }
  return !stripZeroWidthSpacers(node.textContent).length;
}
