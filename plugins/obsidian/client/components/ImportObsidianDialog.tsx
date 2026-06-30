import { Trans } from "react-i18next";
import Text from "@shared/components/Text";
import { IntegrationService } from "@shared/types";
import useStores from "~/hooks/useStores";
import DropToImport from "~/scenes/Settings/components/DropToImport";

export function ImportObsidianDialog() {
  const { dialogs } = useStores();

  return (
    <>
      <Text as="p">
        <Trans>
          Import a zip file of an Obsidian vault – folders, notes, attachments,
          and internal links between notes will be imported. In Obsidian, zip
          your vault folder and upload it below.
        </Trans>
      </Text>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        service={IntegrationService.Obsidian}
      >
        <Trans>
          Drag and drop the zip file of your Obsidian vault, or click to upload
        </Trans>
      </DropToImport>
    </>
  );
}
