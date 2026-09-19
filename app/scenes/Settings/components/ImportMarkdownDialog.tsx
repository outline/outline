import { Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import env from "~/env";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import Text from "@shared/components/Text";

function ImportMarkdownDialog() {
  const { dialogs } = useStores();
  const appName = env.APP_NAME;

  return (
    <>
      <Text as="p">
        <Trans
          defaults="You can import a zip file that was previously exported from an Outline installation – collections, documents, and images will be imported. In Outline, open <em>Export</em> in the Settings sidebar and click on <em>Export Data</em>."
          components={{
            em: <strong />,
          }}
        />
      </Text>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        service={IntegrationService.Markdown}
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
