import invariant from "invariant";
import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import getDataTransferFiles from "@shared/utils/getDataTransferFiles";
import { cdnPath } from "@shared/utils/urls";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import HelpText from "~/components/HelpText";
import Item from "~/components/List/Item";
import OutlineLogo from "~/components/OutlineLogo";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { uploadFile } from "~/utils/uploadFile";

function Import() {
  const { t } = useTranslation();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { collections } = useStores();
  const { showToast } = useToasts();
  const [isImporting, setImporting] = React.useState(false);

  const handleFilePicked = React.useCallback(
    async (ev) => {
      const files = getDataTransferFiles(ev);
      const file = files[0];
      invariant(file, "File must exist to upload");

      setImporting(true);

      try {
        const attachment = await uploadFile(file, {
          name: file.name,
        });
        await collections.import(attachment.id);
        showToast(
          t("Your import is being processed, you can safely leave this page"),
          {
            type: "success",
            timeout: 8000,
          }
        );
      } catch (err) {
        showToast(err.message);
      } finally {
        if (fileRef.current) {
          fileRef.current.value = "";
        }

        setImporting(false);
      }
    },
    [t, collections, showToast]
  );

  const handlePickFile = React.useCallback(
    (ev) => {
      ev.preventDefault();

      if (fileRef.current) {
        fileRef.current.click();
      }
    },
    [fileRef]
  );

  return (
    <Scene title={t("Import")} icon={<DocumentIcon color="currentColor" />}>
      <Heading>{t("Import")}</Heading>
      <HelpText>
        <Trans>
          Quickly transfer your existing documents, pages, and files from other
          tools and services into Outline. You can also drag and drop any HTML,
          Markdown, and text documents directly into Collections in the app.
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

      <div>
        <Item
          image={<OutlineLogo size={28} fill="currentColor" />}
          title="Outline"
          subtitle={t(
            "Import a backup file that was previously exported from Outline"
          )}
          actions={
            <Button
              type="submit"
              onClick={handlePickFile}
              disabled={isImporting}
              neutral
            >
              {isImporting ? `${t("Uploading")}…` : t("Import")}
            </Button>
          }
        />
        <Item
          image={<img src={cdnPath("/images/confluence.png")} width={28} />}
          title="Confluence"
          subtitle={t("Import pages from a Confluence instance")}
          actions={
            <Button type="submit" onClick={handlePickFile} disabled neutral>
              {t("Coming soon")}
            </Button>
          }
        />
        <Item
          image={<img src={cdnPath("/images/notion.png")} width={28} />}
          title="Notion"
          subtitle={t("Import documents from Notion")}
          actions={
            <Button type="submit" onClick={handlePickFile} disabled neutral>
              {t("Coming soon")}
            </Button>
          }
        />
      </div>
    </Scene>
  );
}

export default observer(Import);
