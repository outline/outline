import { observer } from "mobx-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import useStores from "~/hooks/useStores";
import { ImportSlabDialog } from "./components/ImportSlabDialog";

export const Slab = observer(() => {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  const handleClick = useCallback(() => {
    dialogs.openModal({
      title: t("Import data"),
      content: <ImportSlabDialog />,
    });
  }, [t, dialogs]);

  return (
    <Button type="submit" onClick={handleClick} neutral>
      {t("Import")}…
    </Button>
  );
});
