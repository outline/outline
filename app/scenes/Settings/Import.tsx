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

type Config = {
  title: string;
  subtitle: string;
  icon: React.ReactElement;
  action: React.ReactElement;
};

function Import() {
  const { t } = useTranslation();
  const { dialogs, fileOperations } = useStores();
  const appName = env.APP_NAME;

  const configs: Config[] = React.useMemo(
    () => [
      {
        title: t("Markdown"),
        subtitle: t(
          "Import a zip file of Markdown documents (exported from version 0.67.0 or earlier)"
        ),
        icon: <MarkdownIcon size={28} />,
        action: (
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
        ),
      },
      {
        title: "JSON",
        subtitle: t(
          "Import a JSON data file exported from another {{ appName }} instance",
          {
            appName,
          }
        ),
        icon: <OutlineIcon size={28} cover />,
        action: (
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
        ),
      },
      {
        title: "Notion",
        subtitle: t("Import pages exported from Notion"),
        icon: <img src={cdnPath("/images/notion.png")} width={28} />,
        action: (
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
        ),
      },
      {
        title: "Confluence",
        subtitle: t("Import pages from a Confluence instance"),
        icon: <img src={cdnPath("/images/confluence.png")} width={28} />,
        action: (
          <Button type="submit" disabled neutral>
            {t("Enterprise")}
          </Button>
        ),
      },
    ],
    [t, dialogs, appName]
  );

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
        {configs.map((config) => (
          <Item
            key={config.title}
            title={config.title}
            subtitle={config.subtitle}
            image={config.icon}
            actions={config.action}
            border={false}
          />
        ))}
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
