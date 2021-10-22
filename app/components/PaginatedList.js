// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { isEqual } from "lodash";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import { Waypoint } from "react-waypoint";
import AuthStore from "stores/AuthStore";
import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import DelayedMount from "components/DelayedMount";
import PlaceholderList from "components/List/Placeholder";
import { dateToHeading } from "utils/dates";

type Props = {
  fetch?: (options: ?Object) => Promise<any>,
  options?: Object,
  heading?: React.Node,
  empty?: React.Node,
  items: any[],
  auth: AuthStore,
  renderItem: (any, index: number) => React.Node,
  renderHeading?: (name: React.Element<any> | string) => React.Node,
  t: TFunction,
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
    if (
      prevProps.fetch !== this.props.fetch ||
      !isEqual(prevProps.options, this.props.options)
    ) {
      this.reset();
      this.fetchResults();
    }
  }

  reset = () => {
    this.offset = 0;
    this.allowLoadMore = true;
    this.renderCount = DEFAULT_PAGINATION_LIMIT;
    this.isFetching = false;
    this.isFetchingMore = false;
    this.isLoaded = false;
  };

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
    const { items, heading, auth, empty, renderHeading } = this.props;

    let previousHeading = "";
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
              {items.slice(0, this.renderCount).map((item, index) => {
                const children = this.props.renderItem(item, index);

                // If there is no renderHeading method passed then no date
                // headings are rendered
                if (!renderHeading) {
                  return children;
                }

                // Our models have standard date fields, updatedAt > createdAt.
                // Get what a heading would look like for this item
                const currentDate =
                  item.updatedAt || item.createdAt || previousHeading;
                const currentHeading = dateToHeading(
                  currentDate,
                  this.props.t,
                  auth.user?.language
                );

                // If the heading is different to any previous heading then we
                // should render it, otherwise the item can go under the previous
                // heading
                if (!previousHeading || currentHeading !== previousHeading) {
                  previousHeading = currentHeading;

                  return (
                    <React.Fragment key={item.id}>
                      {renderHeading(currentHeading)}
                      {children}
                    </React.Fragment>
                  );
                }

                return children;
              })}
            </ArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.renderCount} onEnter={this.loadMoreResults} />
            )}
          </>
        )}
        {showLoading && (
          <DelayedMount>
            <PlaceholderList count={5} />
          </DelayedMount>
        )}
      </>
    );
  }
}

export const Component = PaginatedList;

export default withTranslation()<PaginatedList>(inject("auth")(PaginatedList));
