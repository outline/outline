import { observer } from "mobx-react";
import {
  archiveNote,
  deleteNote,
  pinNoteToNotebook,
  restoreNote,
  starNote,
  unpinNote,
  unpublishNote,
  unstarNote,
} from "~/actions/definitions/documents";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Note from "~/models/Note";
import type { Action } from "~/types";
/**
 * The note actions offered in the bulk selection toolbar. These are the
 * same action definitions used by note menus — they operate on the active
 * models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [
  starNote,
  unstarNote,
  pinNoteToNotebook,
  unpinNote,
  archiveNote,
  unpublishNote,
  restoreNote,
  deleteNote,
];
/**
 * Renders the selection toolbar with the standard note actions.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function NoteSelectionToolbar() {
  const selection = useModelSelection();
  const { notes } = useStores();
  if (!selection) {
    return null;
  }
  const selectedNotes = selection.selectedIds
    .map((id) => notes.get(id))
    .filter((note): note is Note => !!note);
  return (
    <ModelSelectionActionToolbar
      models={selectedNotes}
      actions={toolbarActions}
    />
  );
}
export default observer(NoteSelectionToolbar);
