import { observer } from "mobx-react";
import { DownloadIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import FileOperation from "~/models/FileOperation";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import ExportDialog from "../../components/ExportDialog";
import FileOperationListItem from "./components/FileOperationListItem";

function Export() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { fileOperations, dialogs } = useStores();

  const handleOpenDialog = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();

      dialogs.openModal({
        title: t("Export data"),
        content: <ExportDialog onSubmit={dialogs.closeAllModals} />,
      });
    },
    [dialogs, t]
  );

  return (
    <Scene title={t("Export")} icon={<DownloadIcon />}>
      <Heading>{t("Export")}</Heading>
      <Text as="p" type="secondary">
        <Trans
          defaults="A full export might take some time, consider exporting a single document or collection. You may leave this page once the export has started – if you have notifications enabled, we will email a link to <em>{{ userEmail }}</em> when it’s complete."
          values={{
            userEmail: user.email,
          }}
          components={{
            em: <strong />,
          }}
        />
      </Text>
      <Button type="submit" onClick={handleOpenDialog}>
        {t("Export data")}…
      </Button>
      <br />
      <PaginatedList
        items={fileOperations.exports}
        fetch={fileOperations.fetchPage}
        options={{
          type: "export",
        }}
        heading={
          <h2>
            <Trans>Recent exports</Trans>
          </h2>
        }
        renderItem={(item: FileOperation) => (
          <FileOperationListItem key={item.id} fileOperation={item} />
        )}
      />
    </Scene>
  );
}

export default observer(Export);
