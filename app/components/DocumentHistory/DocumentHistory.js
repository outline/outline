// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import Waypoint from 'react-waypoint';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/DocumentsStore';
import Document from 'models/Document';
import RevisionsStore from 'stores/RevisionsStore';

import Flex from 'shared/components/Flex';
import { ListPlaceholder } from 'components/LoadingPlaceholder';
import Revision from './components/Revision';
import { documentHistoryUrl } from 'utils/routeHelpers';

type Props = {
  match: Object,
  document: Document,
  revisions: RevisionsStore,
  revision?: Object,
  history: Object,
};

@observer
class DocumentHistory extends React.Component<Props> {
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  async componentDidMount() {
    this.selectFirstRevision();
    await this.loadMoreResults();
    this.selectFirstRevision();
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.revisions.fetchPage({
      limit,
      offset: this.offset,
      id: this.props.document.id,
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
    const revisions = this.revisions;
    if (revisions.length && !this.props.revision) {
      this.props.history.replace(
        documentHistoryUrl(this.props.document, this.revisions[0].id)
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
    return this.props.revisions.getDocumentRevisions(this.props.document.id);
  }

  render() {
    const showLoading = !this.isLoaded && this.isFetching;

    return (
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
                document={this.props.document}
                showMenu={index !== 0}
              />
            ))}
          </ArrowKeyNavigation>
        )}
        {this.allowLoadMore && (
          <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
        )}
      </Wrapper>
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
  bottom: 0;

  min-width: ${props => props.theme.sidebarWidth};
  border-left: 1px solid ${props => props.theme.slateLight};
  overflow: scroll;
  overscroll-behavior: none;
`;

export default withRouter(inject('revisions')(DocumentHistory));
