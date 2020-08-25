// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { action, observable } from "mobx";
import { inject, observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { type Match, Redirect, type RouterHistory } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";

import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import DocumentsStore from "stores/DocumentsStore";
import RevisionsStore from "stores/RevisionsStore";
import Document from "models/Document";

import Flex from "components/Flex";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Button from "../Button";
import Revision from "./components/Revision";
import { documentHistoryUrl, documentUrl } from "utils/routeHelpers";

type Props = {
  match: Match,
  documents: DocumentsStore,
  revisions: RevisionsStore,
  history: RouterHistory,
};

@observer
class DocumentHistory extends React.Component<Props> {
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;
  @observable redirectTo: ?string;

  async componentDidMount() {
    await this.loadMoreResults();
    this.selectFirstRevision();
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.revisions.fetchPage({
      limit,
      offset: this.offset,
      documentId: this.props.match.params.documentSlug,
    });

    if (
      results &&
      (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT)
    ) {
      this.allowLoadMore = false;
    } else {
      this.offset += DEFAULT_PAGINATION_LIMIT;
    }

    this.isLoaded = true;
    this.isFetching = false;
  };

  selectFirstRevision = () => {
    if (this.revisions.length) {
      const document = this.props.documents.getByUrl(
        this.props.match.params.documentSlug
      );
      if (!document) return;

      this.props.history.replace(
        documentHistoryUrl(document, this.revisions[0].id)
      );
    }
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;
    await this.fetchResults();
  };

  get revisions() {
    const document = this.props.documents.getByUrl(
      this.props.match.params.documentSlug
    );
    if (!document) return [];
    return this.props.revisions.getDocumentRevisions(document.id);
  }

  onCloseHistory = (document: Document) => {
    this.redirectTo = documentUrl(document);
  };

  render() {
    const document = this.props.documents.getByUrl(
      this.props.match.params.documentSlug
    );
    const showLoading = (!this.isLoaded && this.isFetching) || !document;

    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    return (
      <Sidebar>
        <Wrapper column>
          <Header justify={"center"}>
            <Title>History</Title>
            <CloseButton
              icon={<CloseIcon />}
              onClick={() => this.onCloseHistory(document)}
              neutral
              borderOnHover
            />
          </Header>
          {showLoading ? (
            <Loading>
              <ListPlaceholder count={5} />
            </Loading>
          ) : (
            <ArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {this.revisions.map((revision, index) => (
                <Revision
                  key={revision.id}
                  revision={revision}
                  document={document}
                  showMenu={index !== 0}
                  selected={this.props.match.params.revisionId === revision.id}
                />
              ))}
            </ArrowKeyNavigation>
          )}
          {this.allowLoadMore && (
            <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
          )}
        </Wrapper>
      </Sidebar>
    );
  }
}

const Loading = styled.div`
  margin: 0 16px;
`;

const Wrapper = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1;
  min-width: ${(props) => props.theme.sidebarWidth};
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: none;
`;

const Sidebar = styled(Flex)`
  background: ${(props) => props.theme.background};
  min-width: ${(props) => props.theme.sidebarWidth};
  border-left: 1px solid ${(props) => props.theme.divider};
  z-index: 1;
`;

const Title = styled.h3`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 20px;
  margin-top: 0;
  margin-bottom: 0.25em;
  white-space: nowrap;
  color: ${(props) => props.theme.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

const Header = styled(Flex)`
  position: relative;
  padding: 20px;
  border-bottom: 1px solid ${(props) => props.theme.divider};
`;

const CloseButton = styled(Button)`
  position: absolute;
  top: 10px;
  right: 10px;
`;

export default inject("documents", "revisions")(DocumentHistory);
