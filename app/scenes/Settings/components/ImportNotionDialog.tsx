import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FileOperationFormat } from "@shared/types";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import HelpDisclosure from "./HelpDisclosure";

function ImportNotionDialog() {
  const { t } = useTranslation();
  const { dialogs } = useStores();

  return (
    <>
      <HelpDisclosure title={<Trans>Where do I find the file?</Trans>}>
        <Trans
          defaults="In Notion, click <em>Settings & Members</em> in the left sidebar and open Settings. Look for the Export section, and click <em>Export all workspace content</em>. Choose <em>HTML</em> as the format for the best data compatability."
          components={{
            em: <strong />,
          }}
        />
      </HelpDisclosure>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        format={FileOperationFormat.Notion}
      >
        <>
          {t(
            `Drag and drop the zip file from Notion's HTML export option, or click to upload`
          )}
        </>
      </DropToImport>
    </>
  );
}

export default ImportNotionDialog;
