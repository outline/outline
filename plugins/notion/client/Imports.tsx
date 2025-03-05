import { observer } from "mobx-react";
import React from "react";
import { useTranslation } from "react-i18next";
import ImportNotionDialog from "~/scenes/Settings/components/ImportNotionDialog";
import Button from "~/components/Button";
import useStores from "~/hooks/useStores";

export const Notion = observer(() => {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  return (
    <Button
      type="submit"
      onClick={() => {
        dialogs.openModal({
          title: t("Import data"),
          content: <ImportNotionDialog />,
        });
      }}
      neutral
    >
      {t("Import")}…
    </Button>
  );
});
