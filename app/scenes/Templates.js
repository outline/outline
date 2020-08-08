// @flow
import * as React from "react";
import { observer, inject } from "mobx-react";
import { type Match } from "react-router-dom";

import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";
import Heading from "components/Heading";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Tabs from "components/Tabs";
import Tab from "components/Tab";
import NewTemplateMenu from "menus/NewTemplateMenu";
import Actions, { Action } from "components/Actions";
import DocumentsStore from "stores/DocumentsStore";

type Props = {
  documents: DocumentsStore,
  match: Match,
};

@observer
class Templates extends React.Component<Props> {
  render() {
    const {
      fetchTemplates,
      templates,
      templatesAlphabetical,
    } = this.props.documents;
    const { sort } = this.props.match.params;

    return (
      <CenteredContent column auto>
        <PageTitle title="Templates" />
        <Heading>Templates</Heading>
        <PaginatedDocumentList
          heading={
            <Tabs>
              <Tab to="/templates" exact>
                Recently Updated
              </Tab>
              <Tab to="/templates/alphabetical" exact>
                Alphabetical
              </Tab>
            </Tabs>
          }
          empty={
            <Empty>
              There are no templates just yet. You can create templates to help
              your team create consistent and accurate documentation.
            </Empty>
          }
          fetch={fetchTemplates}
          documents={
            sort === "alphabetical" ? templatesAlphabetical : templates
          }
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
}

export default inject("documents")(Templates);
