import { Trans } from "react-i18next";
import { IntegrationService } from "@shared/types";
import Text from "@shared/components/Text";
import useStores from "~/hooks/useStores";
import DropToImport from "~/scenes/Settings/components/DropToImport";

export function ImportSlabDialog() {
  const { dialogs } = useStores();

  return (
    <>
      <Text as="p">
        <Trans>
          Import a zip file of Markdown documents exported from Slab –
          collections, posts, and images will be imported. In Slab, open the
          admin settings and use the <em>Export</em> option to download an
          archive of your content.
        </Trans>
      </Text>
      <DropToImport
        onSubmit={dialogs.closeAllModals}
        service={IntegrationService.Slab}
      >
        <Trans>
          Drag and drop the zip file exported from Slab, or click to upload
        </Trans>
      </DropToImport>
    </>
  );
}
