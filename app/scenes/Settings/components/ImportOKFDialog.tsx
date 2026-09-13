import { Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import useStores from "~/hooks/useStores";
import DropToImport from "./DropToImport";
import Text from "@shared/components/Text";

function ImportOKFDialog() {
  const { dialogs } = useStores();

  return (
    <>
      <Text as="p">
        <Trans>
          You can import a zip file of an Open Knowledge Format (OKF) bundle –
          folders become collections and documents, and document titles are read
          from YAML frontmatter.
        </Trans>
      </Text>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        service={IntegrationService.OKF}
      >
        <Trans>
          Drag and drop a zip file of the OKF bundle, or click to upload
        </Trans>
      </DropToImport>
    </>
  );
}

export default ImportOKFDialog;
