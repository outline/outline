// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import HelpText from "components/HelpText";
import PageTitle from "components/PageTitle";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";

function ImportExport() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const { ui, collections } = useStores();
  const { showToast } = ui;
  const [isLoading, setLoading] = React.useState(false);
  const [isExporting, setExporting] = React.useState(false);

  const handleImport = React.useCallback(async () => {
    // TODO
  }, []);

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
          It is possible to import a zip file of folders and Markdown files.
        </Trans>
      </HelpText>
      <Button type="submit" onClick={handleImport} primary>
        {t("Import")}
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
