// @flow
import { observer } from "mobx-react";
import { TemplateIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type Match } from "react-router-dom";
import { Action } from "components/Actions";
import Empty from "components/Empty";
import Heading from "components/Heading";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Scene from "components/Scene";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";
import NewTemplateMenu from "menus/NewTemplateMenu";

type Props = {
  match: Match,
};

function Templates(props: Props) {
  const { documents, policies } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { fetchTemplates, templates, templatesAlphabetical } = documents;
  const { sort } = props.match.params;
  const can = policies.abilities(team.id);

  return (
    <Scene
      icon={<TemplateIcon color="currentColor" />}
      title={t("Templates")}
      actions={
        <Action>
          <NewTemplateMenu />
        </Action>
      }
    >
      <Heading>{t("Templates")}</Heading>
      <PaginatedDocumentList
        heading={
          <Tabs>
            <Tab to="/templates" exact>
              {t("Recently updated")}
            </Tab>
            <Tab to="/templates/alphabetical" exact>
              {t("Alphabetical")}
            </Tab>
          </Tabs>
        }
        empty={
          <Empty>
            {t("There are no templates just yet.")}
            {can.createDocument &&
              t(
                "You can create templates to help your team create consistent and accurate documentation."
              )}
          </Empty>
        }
        fetch={fetchTemplates}
        documents={sort === "alphabetical" ? templatesAlphabetical : templates}
        showCollection
        showDraft
      />
    </Scene>
  );
}

export default observer(Templates);
