// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import { withRouter } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import Actions, { Action } from "components/Actions";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Breadcrumb from "components/BreadcrumbRequestedDoc";
import Button from "components/Button";
import ButtonFollow from "components/ButtonFollow";
import CenteredContent from "components/CenteredContent";
import Empty from "components/Empty";
import Heading from "components/Heading";
import Modal from "components/Modal";
import List from "components/List";
import PageTitle from "components/PageTitle";
import User from "../models/User";
import RequestedDocNew from "./RequestedDocNew";

type Props = {
  user: User,
  ui: UiStore,
};

@observer
class RequestedDoc extends React.Component<Props> {
  isPreloaded: boolean = !!this.props.requestedDocs.orderedData.length;
  @observable createRequestedDocModalOpen: boolean = false;

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const { requestedDocs, users } = this.props;

    if (!requestedDocs.isFetching && !requestedDocs.isLoaded) {
      requestedDocs.fetchPage({ limit: 100 });
    }

    if (users) {
      this.props.users.fetchPage();
    }
  }

  handleCreateRequestedDocModalOpen = () => {
    this.createRequestedDocModalOpen = true;
  };

  handleCreateRequestedDocModalClose = () => {
    this.createRequestedDocModalOpen = false;
  };

  renderNoEmpty() {
    const { requestedDocs } = this.props;

    if (requestedDocs.data.size === 0) {
      return <Empty>There is no document request yet.</Empty>;
    }
  }

  render() {
    const { requestedDocs, users } = this.props;
    const showLoading =
      requestedDocs.isFetching && !requestedDocs.orderedData.length;

    return (
      <CenteredContent>
        <PageTitle title="Requested Docs" />
        <Heading>Requested Docs</Heading>

        <List>
          {showLoading ? (
            <ListPlaceholder count={5} />
          ) : (
              <>
                {this.renderNoEmpty()}

                {requestedDocs.orderedData.map((requestedDoc) => (
                  <div key={requestedDoc.id}>
                    <h3 key={requestedDoc.id}> {requestedDoc.title} </h3>

                    <DivStyle>
                      <Breadcrumb
                        requestedDoc={requestedDoc}
                        users={users}
                        onlyText
                      />

                      <ButtonFollow
                        requestedDoc={requestedDoc}
                        users={users}
                        onlyText
                      />
                    </DivStyle>

                    <hr></hr>
                  </div>
                ))}

                {this.allowLoadMore && (
                  <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
                )}
              </>
            )}
        </List>

        <Actions align="center" justify="flex-end">
          <Action>
            <Button
              icon={<NewDocumentIcon />}
              onClick={this.handleCreateRequestedDocModalOpen}
            >
              Create a request document
            </Button>
          </Action>
        </Actions>

        <Modal
          title="Create a request document"
          onRequestClose={this.handleCreateRequestedDocModalClose}
          isOpen={this.createRequestedDocModalOpen}
        >
          <RequestedDocNew onSubmit={this.handleCreateRequestedDocModalClose} />
        </Modal>
      </CenteredContent>
    );
  }
}

const DivStyle = styled.div`
  padding: 5px 0px;
`;

export default inject(
  "requestedDocs",
  "users",
  "policies"
)(withRouter(RequestedDoc));
