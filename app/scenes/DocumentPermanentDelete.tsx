import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
  onSubmit: () => void;
};

function DocumentPermanentDelete({ document, onSubmit }: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();

  const handleSubmit = async () => {
    await documents.delete(document, {
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
          defaults="Are you sure you want to permanently delete the <em>{{ documentTitle }}</em> document? This action is immediate and cannot be undone."
          values={{
            documentTitle: document.titleWithDefault,
          }}
          components={{
            em: <strong />,
          }}
        />
      </ConfirmationDialog>
    </Flex>
  );
}

export default observer(DocumentPermanentDelete);
