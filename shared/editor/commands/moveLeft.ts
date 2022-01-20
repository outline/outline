/*
Copyright 2020 Atlassian Pty Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

// This file is based on the implementation found here:
// https://bitbucket.org/atlassian/design-system-mirror/src/master/editor/editor-core/src/plugins/text-formatting/commands/text-formatting.ts

import {
  Selection,
  EditorState,
  Transaction,
  TextSelection,
} from "prosemirror-state";
import isMarkActive from "../queries/isMarkActive";

function hasCode(state: EditorState, pos: number) {
  const { code_inline } = state.schema.marks;
  const node = pos >= 0 && state.doc.nodeAt(pos);

  return node
    ? !!node.marks.filter((mark) => mark.type === code_inline).length
    : false;
}

export default function moveLeft() {
  return (state: EditorState, dispatch: (tr: Transaction) => void): boolean => {
    const { code_inline } = state.schema.marks;
    const { empty, $cursor } = state.selection as TextSelection;
    if (!empty || !$cursor) {
      return false;
    }

    const { storedMarks } = state.tr;

    if (code_inline) {
      const insideCode = code_inline && isMarkActive(code_inline)(state);
      const currentPosHasCode = hasCode(state, $cursor.pos);
      const nextPosHasCode = hasCode(state, $cursor.pos - 1);
      const nextNextPosHasCode = hasCode(state, $cursor.pos - 2);

      const exitingCode =
        currentPosHasCode && !nextPosHasCode && Array.isArray(storedMarks);
      const atLeftEdge =
        nextPosHasCode &&
        !nextNextPosHasCode &&
        (storedMarks === null ||
          (Array.isArray(storedMarks) && !!storedMarks.length));
      const atRightEdge =
        ((exitingCode && Array.isArray(storedMarks) && !storedMarks.length) ||
          (!exitingCode && storedMarks === null)) &&
        !nextPosHasCode &&
        nextNextPosHasCode;
      const enteringCode =
        !currentPosHasCode &&
        nextPosHasCode &&
        Array.isArray(storedMarks) &&
        !storedMarks.length;

      // at the right edge: remove code mark and move the cursor to the left
      if (!insideCode && atRightEdge) {
        const tr = state.tr.setSelection(
          Selection.near(state.doc.resolve($cursor.pos - 1))
        );

        dispatch(tr.removeStoredMark(code_inline));

        return true;
      }

      // entering code mark (from right edge): don't move the cursor, just add the mark
      if (!insideCode && enteringCode) {
        dispatch(state.tr.addStoredMark(code_inline.create()));
        return true;
      }

      // at the left edge: add code mark and move the cursor to the left
      if (insideCode && atLeftEdge) {
        const tr = state.tr.setSelection(
          Selection.near(state.doc.resolve($cursor.pos - 1))
        );

        dispatch(tr.addStoredMark(code_inline.create()));
        return true;
      }

      // exiting code mark (or at the beginning of the line): don't move the cursor, just remove the mark
      const isFirstChild = $cursor.index($cursor.depth - 1) === 0;
      if (
        insideCode &&
        (exitingCode || (!$cursor.nodeBefore && isFirstChild))
      ) {
        dispatch(state.tr.removeStoredMark(code_inline));
        return true;
      }
    }

    return false;
  };
}
