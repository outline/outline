import { observer } from "mobx-react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import type Note from "~/models/Note";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
type Props = {
  note: Note;
  onSubmit: () => void;
};
function NotePermanentDelete({ note, onSubmit }: Props) {
  const { t } = useTranslation();
  const { notes } = useStores();
  const history = useHistory();
  const handleSubmit = async () => {
    await notes.delete(note, {
      permanent: true,
    });
    toast.success(t("Document permanently deleted"));
    onSubmit();
    history.push("/trash");
  };
  return (
    <Flex column>
      <ConfirmationDialog
        submitText={t("I’m sure – Delete")}
        savingText={`${t("Deleting")}…`}
        onSubmit={handleSubmit}
        danger
      >
        <Trans
          defaults="Are you sure you want to permanently delete the <em>{{ documentTitle }}</em> note? This action is immediate and cannot be undone."
          values={{
            noteTitle: note.titleWithDefault,
          }}
          components={{
            em: <strong />,
          }}
        />
      </ConfirmationDialog>
    </Flex>
  );
}
export default observer(NotePermanentDelete);
