// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { Redirect } from "react-router-dom";

import { newTemplateUrl } from "utils/routeHelpers";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import PageTitle from "components/PageTitle";
import Heading from "components/Heading";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Tabs from "components/Tabs";
import Tab from "components/Tab";
import Button from "components/Button";
import Actions, { Action } from "components/Actions";
import DocumentsStore from "stores/DocumentsStore";

type Props = {
  documents: DocumentsStore,
  match: Object,
};

@observer
class Starred extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewTemplate = () => {
    this.redirectTo = newTemplateUrl();
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

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
          empty={<Empty>No templates, yet.</Empty>}
          fetch={fetchTemplates}
          documents={
            sort === "alphabetical" ? templatesAlphabetical : templates
          }
          showCollection
        />

        <Actions align="center" justify="flex-end">
          <Action>
            <Button icon={<PlusIcon />} onClick={this.handleNewTemplate} small>
              New template
            </Button>
          </Action>
        </Actions>
      </CenteredContent>
    );
  }
}

export default inject("documents")(Starred);
