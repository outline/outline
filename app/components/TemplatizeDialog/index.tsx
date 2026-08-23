import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Switch from "~/components/Switch";
import useStores from "~/hooks/useStores";
import SelectLocation from "./SelectLocation";
type Props = {
  noteId: string;
};
function NoteTemplatizeDialog({ noteId }: Props) {
  const history = useHistory();
  const { t } = useTranslation();
  const { notes, templates } = useStores();
  const note = notes.get(noteId);
  invariant(note, "Note must exist");
  const [publish, setPublish] = React.useState(true);
  const [notebookId, setNotebookId] = React.useState(note.notebookId ?? null);
  const handleSubmit = React.useCallback(async () => {
    const template = await templates.templatize({
      id: noteId,
      notebookId,
      publish,
    });
    if (template) {
      history.push(template.path);
      toast.success(t("Template created, go ahead and customize it"));
    }
  }, [t, templates, noteId, history, notebookId, publish]);
  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Create template")}
      savingText={`${t("Creating")}…`}
    >
      <Flex column gap={12}>
        <div>
          {t(
            "Creating a template is a non-destructive action – we'll make a copy of the document and turn it into a template that can be used as a starting point for new documents."
          )}
        </div>
        <SelectLocation
          defaultNotebookId={notebookId}
          onSelect={setNotebookId}
        />
        <Switch
          name="publish"
          label={t("Published")}
          note={t("Enable other members to use the template immediately")}
          checked={publish}
          onChange={setPublish}
        />
      </Flex>
    </ConfirmationDialog>
  );
}
export default observer(NoteTemplatizeDialog);
