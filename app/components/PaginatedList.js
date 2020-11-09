// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { isEqual } from "lodash";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { Waypoint } from "react-waypoint";
import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import DelayedMount from "components/DelayedMount";
import { ListPlaceholder } from "components/LoadingPlaceholder";

type Props = {
  fetch?: (options: ?Object) => Promise<void>,
  options?: Object,
  heading?: React.Node,
  empty?: React.Node,
  items: any[],
  renderItem: (any) => React.Node,
};

@observer
class PaginatedList extends React.Component<Props> {
  isInitiallyLoaded: boolean = false;
  @observable isLoaded: boolean = false;
  @observable isFetchingMore: boolean = false;
  @observable isFetching: boolean = false;
  @observable renderCount: number = DEFAULT_PAGINATION_LIMIT;
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;

  constructor(props: Props) {
    super(props);
    this.isInitiallyLoaded = this.props.items.length > 0;
  }

  componentDidMount() {
    this.fetchResults();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.fetch !== this.props.fetch) {
      this.fetchResults();
    }
    if (!isEqual(prevProps.options, this.props.options)) {
      this.fetchResults();
    }
  }

  fetchResults = async () => {
    if (!this.props.fetch) return;

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

    this.renderCount += limit;
    this.isLoaded = true;
    this.isFetching = false;
    this.isFetchingMore = false;
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re currently fetching
    if (!this.allowLoadMore || this.isFetching) return;

    // If there are already cached results that we haven't yet rendered because
    // of lazy rendering then show another page.
    const leftToRender = this.props.items.length - this.renderCount;
    if (leftToRender > 1) {
      this.renderCount += DEFAULT_PAGINATION_LIMIT;
    }

    // If there are less than a pages results in the cache go ahead and fetch
    // another page from the server
    if (leftToRender <= DEFAULT_PAGINATION_LIMIT) {
      this.isFetchingMore = true;
      await this.fetchResults();
    }
  };

  render() {
    const { items, heading, empty } = this.props;

    const showLoading =
      this.isFetching && !this.isFetchingMore && !this.isInitiallyLoaded;
    const showEmpty = !items.length && !showLoading;
    const showList =
      (this.isLoaded || this.isInitiallyLoaded) && !showLoading && !showEmpty;

    return (
      <>
        {showEmpty && empty}
        {showList && (
          <>
            {heading}
            <ArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {items.slice(0, this.renderCount).map(this.props.renderItem)}
            </ArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.renderCount} onEnter={this.loadMoreResults} />
            )}
          </>
        )}
        {showLoading && (
          <DelayedMount>
            <ListPlaceholder count={5} />
          </DelayedMount>
        )}
      </>
    );
  }
}

export default PaginatedList;
