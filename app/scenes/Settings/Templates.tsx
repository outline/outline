import { observer } from "mobx-react";
import { ShapesIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Tab from "~/components/Tab";
import Tabs from "~/components/Tabs";
import Text from "~/components/Text";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import NewTemplateMenu from "~/menus/NewTemplateMenu";
import { settingsPath } from "~/utils/routeHelpers";

function Templates() {
  const { documents } = useStores();
  const { t } = useTranslation();
  const param = useQuery();
  const { fetchTemplates, templates, templatesAlphabetical } = documents;
  const sort = param.get("sort") || "recent";

  React.useEffect(() => {
    void documents.fetchDrafts();
  }, [documents]);

  return (
    <Scene
      icon={<ShapesIcon />}
      title={t("Templates")}
      actions={
        <Action>
          <NewTemplateMenu />
        </Action>
      }
    >
      <Heading>{t("Templates")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          You can create templates to help your team create consistent and
          accurate documentation.
        </Trans>
      </Text>

      <PaginatedDocumentList
        heading={
          <Tabs>
            <Tab to={settingsPath("templates")} exactQueryString>
              {t("Recently updated")}
            </Tab>
            <Tab
              to={{
                pathname: settingsPath("templates"),
                search: queryString.stringify({
                  sort: "alphabetical",
                }),
              }}
              exactQueryString
            >
              {t("Alphabetical")}
            </Tab>
          </Tabs>
        }
        empty={<Empty>{t("There are no templates just yet.")}</Empty>}
        fetch={fetchTemplates}
        documents={sort === "alphabetical" ? templatesAlphabetical : templates}
        showCollection
        showDraft
      />
    </Scene>
  );
}

export default observer(Templates);
