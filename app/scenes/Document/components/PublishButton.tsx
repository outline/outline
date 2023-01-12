import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import Button from "~/components/Button";
import useStores from "~/hooks/useStores";
import PublishPopover from "./PublishPopover";

type Props = {
  document: Document;
};

function PublishButton({ document }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = React.useCallback(() => {
    dialogs.openModal({
      title: t("Publish document"),
      isCentered: true,
      content: (
        <PublishPopover
          document={document}
          onPublish={dialogs.closeAllModals}
        />
      ),
    });
  }, [document, t, dialogs]);

  return <Button onClick={handleClick}>{t("Publish")}</Button>;
}

export default observer(PublishButton);
