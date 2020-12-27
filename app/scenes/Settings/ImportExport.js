// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";
import VisuallyHidden from "components/VisuallyHidden";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import getDataTransferFiles from "utils/getDataTransferFiles";

function ImportExport() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const fileRef = React.useRef();
  const { ui, collections, documents } = useStores();
  const { showToast } = ui;
  const [isLoading, setLoading] = React.useState(false);
  const [isImporting, setImporting] = React.useState(false);
  const [isExporting, setExporting] = React.useState(false);

  const handleFilePicked = React.useCallback(
    async (ev) => {
      const files = getDataTransferFiles(ev);
      setImporting(true);

      try {
        const file = files[0];
        await documents.batchImport(file);
        showToast(t("Import completed"));
      } catch (err) {
        showToast(err.message);
      } finally {
        if (fileRef.current) {
          fileRef.current.value = "";
        }
        setImporting(false);
      }
    },
    [t, documents, showToast]
  );

  const handleImport = React.useCallback(() => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  }, [fileRef]);

  const handleExport = React.useCallback(
    async (ev: SyntheticEvent<>) => {
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

  return (
    <CenteredContent>
      <PageTitle title={t("Import / Export")} />
      <h1>{t("Import")}</h1>
      <HelpText>
        <Trans>
          It is possible to import a zip file of folders and Markdown files
          previously exported from an Outline instance. Support will soon be
          added for importing from other services.
        </Trans>
      </HelpText>
      <VisuallyHidden>
        <input
          type="file"
          ref={fileRef}
          onChange={handleFilePicked}
          accept="application/zip"
        />
      </VisuallyHidden>
      <Button
        type="submit"
        onClick={handleImport}
        disabled={isImporting}
        primary
      >
        {isImporting ? `${t("Importing")}…` : t("Import Data")}
      </Button>

      <h1>{t("Export")}</h1>
      <HelpText>
        <Trans>
          A full export might take some time, consider exporting a single
          document or collection if possible. We’ll put together a zip of all
          your documents in Markdown format and email it to{" "}
          <strong>{{ userEmail: user.email }}</strong>.
        </Trans>
      </HelpText>
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
    </CenteredContent>
  );
}

export default observer(ImportExport);
