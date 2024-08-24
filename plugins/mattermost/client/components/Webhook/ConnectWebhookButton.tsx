import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import useStores from "~/hooks/useStores";
import AddWebhookDialog from "./AddWebhookDialog";

type Props = {
  collection: Collection;
};

const ConnectWebhookButton = ({ collection }: Props) => {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleAddCollectionWebhook = React.useCallback(() => {
    dialogs.openModal({
      title: t("Setup webhook"),
      content: (
        <AddWebhookDialog
          collection={collection}
          onSave={dialogs.closeAllModals}
        />
      ),
    });
  }, [collection]);

  return (
    <Button neutral onClick={handleAddCollectionWebhook}>
      {t("Connect")}
    </Button>
  );
};

export default observer(ConnectWebhookButton);
