import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";

type Props = {
  onSubmit: () => void;
  shouldRedirect: boolean;
};

function DeleteDocumentsInTrash({ onSubmit, shouldRedirect }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();

  const handleSubmit = async () => {
    await documents.emptyTrash();
    toast.success(t("Trash emptied"));
    onSubmit();
    if (shouldRedirect) {
      history.push("/home");
    }
  };

  return (
    <Flex column>
      <ConfirmationDialog
        submitText={t("I’m sure – Delete")}
        savingText={`${t("Deleting")}…`}
        onSubmit={handleSubmit}
        danger
      >
        <Trans defaults="Are you sure you want to permanently delete all the documents in Trash? This action is immediate and cannot be undone." />
      </ConfirmationDialog>
    </Flex>
  );
}

export default observer(DeleteDocumentsInTrash);
