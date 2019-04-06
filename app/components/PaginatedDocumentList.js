// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import Waypoint from 'react-waypoint';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import Document from 'models/Document';
import DocumentList from 'components/DocumentList';
import { ListPlaceholder } from 'components/LoadingPlaceholder';

type Props = {
  documents: Document[],
  fetch: (options: ?Object) => Promise<*>,
  options?: Object,
  heading?: React.Node,
  empty?: React.Node,
};

@observer
class PaginatedDocumentList extends React.Component<Props> {
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  componentDidMount() {
    this.fetchResults();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fetch !== this.props.fetch) {
      this.fetchResults();
    }
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.fetch({
      limit,
      offset: this.offset,
      ...this.props.options,
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

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;
    await this.fetchResults();
  };

  render() {
    const { empty, heading, documents, fetch, options, ...rest } = this.props;
    const showLoading = !this.isLoaded && this.isFetching && !documents.length;
    const showEmpty = this.isLoaded && !documents.length;

    return (
      <React.Fragment>
        {showEmpty ? (
          empty
        ) : (
          <React.Fragment>
            {heading}
            <DocumentList documents={documents} {...rest} />
            {this.allowLoadMore && (
              <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
            )}
          </React.Fragment>
        )}
        {showLoading && <ListPlaceholder count={5} />}
      </React.Fragment>
    );
  }
}

export default PaginatedDocumentList;
