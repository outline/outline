import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Note from "~/models/Note";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { notebookPath, notePath, homePath } from "~/utils/routeHelpers";
type Props = {
  note: Note;
  onSubmit: () => void;
};
function NoteDelete({ note, onSubmit }: Props) {
  const { t } = useTranslation();
  const { ui, notes, notebooks, userMemberships, groupMemberships } =
    useStores();
  const history = useHistory();
  const [isDeleting, setDeleting] = React.useState(false);
  const [isArchiving, setArchiving] = React.useState(false);
  const canArchive = !note.isDraft && !note.isArchived;
  const notebook = note.notebookId ? notebooks.get(note.notebookId) : undefined;
  const nestedNotesCount = notebook
    ? notebook.getChildrenForNote(note.id).length
    : 0;
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setDeleting(true);
      try {
        await note.delete();
        userMemberships.getByNoteId(note.id)?.removeNote(note.id);
        groupMemberships.getByNoteId(note.id)?.removeNote(note.id);
        // only redirect if we're currently viewing the document that's deleted
        if (ui.activeNoteId === note.id) {
          // If the document has a parent and it's available in the store then
          // redirect to it
          if (note.parentNoteId) {
            const parent = notes.get(note.parentNoteId);
            if (parent) {
              history.push(notePath(parent));
              onSubmit();
              return;
            }
          }
          const path = notebook ? notebookPath(notebook) : homePath();
          history.push(path);
        }
        onSubmit();
      } catch (err) {
        toast.error(errToString(err));
      } finally {
        setDeleting(false);
      }
    },
    [
      onSubmit,
      ui,
      note,
      notes,
      history,
      notebook,
      userMemberships,
      groupMemberships,
    ]
  );
  const handleArchive = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setArchiving(true);
      try {
        await note.archive();
        onSubmit();
      } catch (err) {
        toast.error(errToString(err));
      } finally {
        setArchiving(false);
      }
    },
    [onSubmit, note]
  );
  return (
    <form onSubmit={handleSubmit}>
      <Text as="p" type="secondary">
        {nestedNotesCount < 1 ? (
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history</em>."
            values={{
              noteTitle: note.titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ) : (
          <Trans
            count={nestedNotesCount}
            defaults="Are you sure about that? Deleting the <em>{{ documentTitle }}</em> document will delete all of its history and <em>{{ any }} nested document</em>."
            values={{
              noteTitle: note.titleWithDefault,
              any: nestedNotesCount,
            }}
            components={{
              em: <strong />,
            }}
          />
        )}
      </Text>
      {canArchive && (
        <Text as="p" type="secondary">
          <Trans>
            If you’d like the option of referencing or restoring the{" "}
            {{
              noun: note.noun,
            }}{" "}
            in the future, consider archiving it instead.
          </Trans>
        </Text>
      )}

      <Flex justify="flex-end" gap={8}>
        {canArchive && (
          <Button type="button" onClick={handleArchive} neutral>
            {isArchiving ? `${t("Archiving")}…` : t("Archive")}
          </Button>
        )}
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </Flex>
    </form>
  );
}
export default observer(NoteDelete);
