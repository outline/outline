import * as React from "react";
import { Trans } from "react-i18next";
import { FileOperationFormat } from "@shared/types";
import env from "~/env";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import HelpDisclosure from "./HelpDisclosure";

function ImportJSONDialog() {
  const { dialogs } = useStores();
  const appName = env.APP_NAME;

  return (
    <>
      <HelpDisclosure title={<Trans>How does this work?</Trans>}>
        <Trans
          defaults="You can import a zip file that was previously exported from the JSON option in another instance. In {{ appName }}, open <em>Export</em> in the Settings sidebar and click on <em>Export Data</em>."
          values={{ appName }}
          components={{
            em: <strong />,
          }}
        />
      </HelpDisclosure>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        format={FileOperationFormat.JSON}
      >
        <Trans>
          Drag and drop the zip file from the JSON export option in{" "}
          {{ appName }}, or click to upload
        </Trans>
      </DropToImport>
    </>
  );
}

export default ImportJSONDialog;
