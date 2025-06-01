import { Trans, useTranslation } from "react-i18next";
import { FileOperationFormat } from "@shared/types";
import env from "~/env";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import HelpDisclosure from "./HelpDisclosure";

function ImportMarkdownDialog() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const appName = env.APP_NAME;

  return (
    <>
      <HelpDisclosure title={t("How does this work?")}>
        <Trans
          defaults="You can import a zip file that was previously exported from an Outline installation – collections, documents, and images will be imported. In Outline, open <em>Export</em> in the Settings sidebar and click on <em>Export Data</em>."
          components={{
            em: <strong />,
          }}
        />
      </HelpDisclosure>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        format={FileOperationFormat.MarkdownZip}
      >
        <Trans>
          Drag and drop the zip file from the Markdown export option in{" "}
          {{ appName }}, or click to upload
        </Trans>
      </DropToImport>
    </>
  );
}

export default ImportMarkdownDialog;
