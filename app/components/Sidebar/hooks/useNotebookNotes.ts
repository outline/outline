import { useMemo } from "react";
import { sortNavigationNodes } from "@shared/utils/notebooks";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
export default function useNotebookNotes(
  notebook: Notebook | undefined,
  activeNote: Note | undefined
) {
  const insertDraftNote = !!(
    activeNote &&
    activeNote.isActive &&
    activeNote.isDraft &&
    activeNote.notebookId === notebook?.id &&
    !activeNote.parentNoteId
  );
  // Only subscribe to asNavigationNode when we actually need to insert a draft
  // into the sorted list. This avoids every NotebookLinkChildren observer
  // re-rendering on every title keystroke.
  const draftNavNode = insertDraftNote
    ? activeNote?.asNavigationNode
    : undefined;
  return useMemo(() => {
    if (!notebook?.sortedNotes) {
      return undefined;
    }
    return draftNavNode
      ? sortNavigationNodes(
          [draftNavNode, ...notebook.sortedNotes],
          notebook.sort,
          false
        )
      : notebook.sortedNotes;
  }, [draftNavNode, notebook?.sortedNotes, notebook?.sort]);
}
