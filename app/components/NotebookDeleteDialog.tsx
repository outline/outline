import { observer } from "mobx-react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import type Notebook from "~/models/Notebook";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import { homePath } from "~/utils/routeHelpers";
type Props = {
  notebook: Notebook;
  onSubmit: () => void;
};
function NotebookDeleteDialog({ notebook, onSubmit }: Props) {
  const team = useCurrentTeam();
  const { ui } = useStores();
  const history = useHistory();
  const { t } = useTranslation();
  const handleSubmit = async () => {
    const redirect = notebook.id === ui.activeNotebookId;
    if (redirect) {
      history.push(homePath());
    }
    await notebook.delete();
    onSubmit();
    toast.success(t("Notebook deleted"));
  };
  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <>
        <Text as="p" type="secondary">
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{notebookName}}</em> notebook is permanent and cannot be restored, however all published documents within will be moved to the trash."
            values={{
              notebookName: notebook.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
        {team.defaultNotebookId === notebook.id ? (
          <Text as="p" type="secondary">
            <Trans
              defaults="Also, <em>{{notebookName}}</em> is being used as the start view – deleting it will reset the start view to the Home page."
              values={{
                notebookName: notebook.name,
              }}
              components={{
                em: <strong />,
              }}
            />
          </Text>
        ) : null}
      </>
    </ConfirmationDialog>
  );
}
export default observer(NotebookDeleteDialog);
