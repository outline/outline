import invariant from "invariant";
import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import getDataTransferFiles from "@shared/utils/getDataTransferFiles";
import { cdnPath } from "@shared/utils/urls";
import FileOperation from "~/models/FileOperation";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Item from "~/components/List/Item";
import OutlineLogo from "~/components/OutlineLogo";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { uploadFile } from "~/utils/files";
import FileOperationListItem from "./components/FileOperationListItem";

function Import() {
  const { t } = useTranslation();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { collections, fileOperations } = useStores();
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
    <Scene title={t("Import")} icon={<NewDocumentIcon color="currentColor" />}>
      <Heading>{t("Import")}</Heading>
      <Text type="secondary">
        <Trans>
          Quickly transfer your existing documents, pages, and files from other
          tools and services into Outline. You can also drag and drop any HTML,
          Markdown, and text documents directly into Collections in the app.
        </Trans>
      </Text>
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
          border={false}
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
          border={false}
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
          border={false}
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
      <br />
      <PaginatedList
        items={fileOperations.imports}
        fetch={fileOperations.fetchPage}
        options={{
          type: "import",
        }}
        heading={
          <h2>
            <Trans>Recent imports</Trans>
          </h2>
        }
        renderItem={(item: FileOperation) => (
          <FileOperationListItem key={item.id} fileOperation={item} />
        )}
      />
    </Scene>
  );
}

export default observer(Import);
