// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import Waypoint from 'react-waypoint';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import { ListPlaceholder } from 'components/LoadingPlaceholder';

type Props = {
  fetch: (options: ?Object) => Promise<void>,
  options?: Object,
  empty?: React.Node,
  items: any[],
  renderItem: any => React.Node,
};

@observer
class PaginatedList extends React.Component<Props> {
  isInitiallyLoaded: boolean = false;
  @observable isLoaded: boolean = false;
  @observable isFetchingMore: boolean = false;
  @observable isFetching: boolean = false;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  componentDidMount() {
    this.isInitiallyLoaded = !!this.props.items.length;
    this.fetchResults();
  }

  fetchResults = async () => {
    this.isFetching = true;

    const limit = DEFAULT_PAGINATION_LIMIT;
    const results = await this.props.fetch({
      limit,
      offset: this.offset,
      ...this.props.options,
    });

    if (results && (results.length === 0 || results.length < limit)) {
      this.allowLoadMore = false;
    } else {
      this.offset += limit;
    }

    this.isLoaded = true;
    this.isFetching = false;
    this.isFetchingMore = false;
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;

    this.isFetchingMore = true;
    await this.fetchResults();
  };

  render() {
    const { items, empty } = this.props;

    const showLoading =
      this.isFetching && !this.isFetchingMore && !this.isInitiallyLoaded;
    const showEmpty = !items.length || showLoading;
    const showList = (this.isLoaded || this.isInitiallyLoaded) && !showLoading;

    return (
      <React.Fragment>
        {showEmpty && empty}
        {showList && (
          <React.Fragment>
            <ArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {items.map(this.props.renderItem)}
            </ArrowKeyNavigation>
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

export default PaginatedList;
