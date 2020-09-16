// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { action, observable } from "mobx";
import { inject, observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { type Match, Redirect, type RouterHistory } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";

import breakpoint from "styled-components-breakpoint";
import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import DocumentsStore from "stores/DocumentsStore";
import RevisionsStore from "stores/RevisionsStore";

import Button from "components/Button";
import Flex from "components/Flex";
import { ListPlaceholder } from "components/LoadingPlaceholder";
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

  onCloseHistory = () => {
    const document = this.props.documents.getByUrl(
      this.props.match.params.documentSlug
    );

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
          <Header>
            <Title>History</Title>
            <Button
              icon={<CloseIcon />}
              onClick={this.onCloseHistory}
              borderOnHover
              neutral
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
  display: none;
  background: ${(props) => props.theme.background};
  min-width: ${(props) => props.theme.sidebarWidth};
  border-left: 1px solid ${(props) => props.theme.divider};
  z-index: 1;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  align-items: center;
  position: relative;
  padding: 12px;
  border-bottom: 1px solid ${(props) => props.theme.divider};
  color: ${(props) => props.theme.text};
  flex-shrink: 0;
`;

export default inject("documents", "revisions")(DocumentHistory);
