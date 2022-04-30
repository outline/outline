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
import useToasts from "~/hooks/useToasts";
import FileOperationListItem from "./components/FileOperationListItem";

function Export() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { fileOperations, collections } = useStores();
  const { showToast } = useToasts();
  const [isLoading, setLoading] = React.useState(false);
  const [isExporting, setExporting] = React.useState(false);

  const handleExport = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setLoading(true);

      try {
        await collections.export();
        setExporting(true);
        showToast(t("Export in progress…"));
      } finally {
        setLoading(false);
      }
    },
    [t, collections, showToast]
  );

  const handleDelete = React.useCallback(
    async (fileOperation: FileOperation) => {
      try {
        await fileOperations.delete(fileOperation);
        showToast(t("Export deleted"));
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [fileOperations, showToast, t]
  );

  return (
    <Scene title={t("Export")} icon={<DownloadIcon color="currentColor" />}>
      <Heading>{t("Export")}</Heading>
      <Text type="secondary">
        <Trans
          defaults="A full export might take some time, consider exporting a single document or collection. The exported data is a zip of your documents in Markdown format. You may leave this page once the export has started – we will email a link to <em>{{ userEmail }}</em> when it’s complete."
          values={{
            userEmail: user.email,
          }}
          components={{
            em: <strong />,
          }}
        />
      </Text>
      <Button
        type="submit"
        onClick={handleExport}
        disabled={isLoading || isExporting}
        primary
      >
        {isExporting
          ? t("Export Requested")
          : isLoading
          ? `${t("Requesting Export")}…`
          : t("Export Data")}
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
          <FileOperationListItem
            key={item.id}
            fileOperation={item}
            handleDelete={handleDelete}
          />
        )}
      />
    </Scene>
  );
}

export default observer(Export);
