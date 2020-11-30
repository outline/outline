// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { type Match } from "react-router-dom";

import Actions, { Action } from "components/Actions";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Heading from "components/Heading";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import useStores from "hooks/useStores";
import NewTemplateMenu from "menus/NewTemplateMenu";

type Props = {
  match: Match,
};

function Templates(props: Props) {
  const { documents } = useStores();
  const { t } = useTranslation();
  const { fetchTemplates, templates, templatesAlphabetical } = documents;
  const { sort } = props.match.params;

  return (
    <CenteredContent column auto>
      <PageTitle title={t("Templates")} />
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
            {t(
              "There are no templates just yet. You can create templates to help your team create consistent and accurate documentation."
            )}
          </Empty>
        }
        fetch={fetchTemplates}
        documents={sort === "alphabetical" ? templatesAlphabetical : templates}
        showCollection
        showDraft
      />

      <Actions align="center" justify="flex-end">
        <Action>
          <NewTemplateMenu />
        </Action>
      </Actions>
    </CenteredContent>
  );
}

export default observer(Templates);
