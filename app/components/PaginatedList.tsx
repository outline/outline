import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { isEqual } from "lodash";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { withTranslation, WithTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import RootStore from "~/stores/RootStore";
import DelayedMount from "~/components/DelayedMount";
import PlaceholderList from "~/components/List/Placeholder";
import withStores from "~/components/withStores";
import { dateToHeading } from "~/utils/dates";

type Props = WithTranslation &
  RootStore & {
    fetch?: (options: Record<string, any> | null | undefined) => Promise<any>;
    options?: Record<string, any>;
    heading?: React.ReactNode;
    empty?: React.ReactNode;

    items: any[];
    renderItem: (arg0: any, index: number) => React.ReactNode;
    renderHeading?: (name: React.ReactElement<any> | string) => React.ReactNode;
  };

@observer
class PaginatedList extends React.Component<Props> {
  isInitiallyLoaded = this.props.items.length > 0;

  @observable
  isLoaded = false;

  @observable
  isFetchingMore = false;

  @observable
  isFetching = false;

  @observable
  renderCount: number = DEFAULT_PAGINATION_LIMIT;

  @observable
  offset = 0;

  @observable
  allowLoadMore = true;

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
    if (!this.props.fetch) {
      return;
    }
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
    if (!this.allowLoadMore || this.isFetching) {
      return;
    }
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

export default withTranslation()(withStores(PaginatedList));
