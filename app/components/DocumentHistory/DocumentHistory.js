// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import type { RouterHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Waypoint } from 'react-waypoint';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import DocumentsStore from 'stores/DocumentsStore';
import RevisionsStore from 'stores/RevisionsStore';

import Flex from 'shared/components/Flex';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Revision from './components/Revision';
import { documentHistoryUrl } from 'utils/routeHelpers';

type Props = {
  match: Object,
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
      id: this.props.match.params.documentSlug,
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

  render() {
    const document = this.props.documents.getByUrl(
      this.props.match.params.documentSlug
    );
    const showLoading = (!this.isLoaded && this.isFetching) || !document;

    return (
      <Sidebar>
        <Wrapper column>
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
  min-width: ${props => props.theme.sidebarWidth};
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: none;
`;

const Sidebar = styled(Flex)`
  background: ${props => props.theme.background};
  min-width: ${props => props.theme.sidebarWidth};
  border-left: 1px solid ${props => props.theme.divider};
  z-index: 1;
`;

export default inject('documents', 'revisions')(DocumentHistory);
