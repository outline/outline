import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
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
import FileOperationListItem from "./components/FileOperationListItem";
import ImportNotionDialog from "./components/ImportNotionDialog";
import ImportOutlineDialog from "./components/ImportOutlineDialog";

function Import() {
  const { t } = useTranslation();
  const { dialogs, fileOperations } = useStores();

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
              onClick={() => {
                dialogs.openModal({
                  title: t("Import data"),
                  isCentered: true,
                  content: <ImportOutlineDialog />,
                });
              }}
              neutral
            >
              {t("Import")}…
            </Button>
          }
        />
        <Item
          border={false}
          image={<img src={cdnPath("/images/notion.png")} width={28} />}
          title="Notion"
          subtitle={t("Import pages exported from Notion")}
          actions={
            <Button
              type="submit"
              onClick={() => {
                dialogs.openModal({
                  title: t("Import data"),
                  isCentered: true,
                  content: <ImportNotionDialog />,
                });
              }}
              neutral
            >
              {t("Import")}…
            </Button>
          }
        />
        <Item
          border={false}
          image={<img src={cdnPath("/images/confluence.png")} width={28} />}
          title="Confluence"
          subtitle={t("Import pages from a Confluence instance")}
          actions={
            <Button type="submit" disabled neutral>
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
