import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { FileOperationType } from "@shared/types";
import { cdnPath } from "@shared/utils/urls";
import FileOperation from "~/models/FileOperation";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import Item from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import env from "~/env";
import useStores from "~/hooks/useStores";
import FileOperationListItem from "./components/FileOperationListItem";
import ImportJSONDialog from "./components/ImportJSONDialog";
import ImportMarkdownDialog from "./components/ImportMarkdownDialog";
import ImportNotionDialog from "./components/ImportNotionDialog";

function Import() {
  const { t } = useTranslation();
  const { dialogs, fileOperations } = useStores();
  const appName = env.APP_NAME;

  return (
    <Scene title={t("Import")} icon={<NewDocumentIcon />}>
      <Heading>{t("Import")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Quickly transfer your existing documents, pages, and files from other
          tools and services into {{ appName }}. You can also drag and drop any
          HTML, Markdown, and text documents directly into Collections in the
          app.
        </Trans>
      </Text>

      <div>
        <Item
          border={false}
          image={<MarkdownIcon size={28} />}
          title={t("Markdown")}
          subtitle={t(
            "Import a zip file of Markdown documents (exported from version 0.67.0 or earlier)"
          )}
          actions={
            <Button
              type="submit"
              onClick={() => {
                dialogs.openModal({
                  title: t("Import data"),
                  content: <ImportMarkdownDialog />,
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
          image={<OutlineIcon size={28} cover />}
          title="JSON"
          subtitle={t(
            "Import a JSON data file exported from another {{ appName }} instance",
            {
              appName,
            }
          )}
          actions={
            <Button
              type="submit"
              onClick={() => {
                dialogs.openModal({
                  title: t("Import data"),
                  content: <ImportJSONDialog />,
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
              {t("Enterprise")}
            </Button>
          }
        />
      </div>
      <br />
      <PaginatedList
        items={fileOperations.imports}
        fetch={fileOperations.fetchPage}
        options={{
          type: FileOperationType.Import,
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
