import { isEqual } from "lodash";
import { observable, action } from "mobx";
import { observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { WithTranslation, withTranslation, Trans } from "react-i18next";
import { RouteComponentProps, StaticContext, withRouter } from "react-router";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { v4 as uuidv4 } from "uuid";
import { DateFilter as TDateFilter } from "@shared/types";
import { DEFAULT_PAGINATION_LIMIT } from "~/stores/BaseStore";
import { SearchParams } from "~/stores/DocumentsStore";
import RootStore from "~/stores/RootStore";
import ArrowKeyNavigation from "~/components/ArrowKeyNavigation";
import DocumentListItem from "~/components/DocumentListItem";
import Empty from "~/components/Empty";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import withStores from "~/components/withStores";
import { hover } from "~/styles";
import Logger from "~/utils/Logger";
import { searchPath } from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import RecentSearches from "./components/RecentSearches";
import SearchInput from "./components/SearchInput";
import StatusFilter from "./components/StatusFilter";
import UserFilter from "./components/UserFilter";

type Props = RouteComponentProps<
  { term: string },
  StaticContext,
  { search: string; fromMenu?: boolean }
> &
  WithTranslation &
  RootStore & {
    notFound?: boolean;
  };

@observer
class Search extends React.Component<Props> {
  compositeRef: HTMLDivElement | null | undefined;
  searchInputRef: HTMLInputElement | null | undefined;

  lastQuery = "";

  lastParams: SearchParams;

  @observable
  query: string = decodeURIComponentSafe(this.props.match.params.term || "");

  @observable
  params: URLSearchParams = new URLSearchParams(this.props.location.search);

  @observable
  offset = 0;

  @observable
  allowLoadMore = true;

  @observable
  isLoading = false;

  componentDidMount() {
    this.handleTermChange();

    if (this.props.location.search) {
      this.handleQueryChange();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.location.search !== this.props.location.search) {
      this.handleQueryChange();
    }

    if (prevProps.match.params.term !== this.props.match.params.term) {
      this.handleTermChange();
    }
  }

  goBack = () => {
    this.props.history.goBack();
  };

  handleKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      this.updateLocation(ev.currentTarget.value);
      this.fetchResults();
      return;
    }

    if (ev.key === "Escape") {
      ev.preventDefault();
      return this.goBack();
    }

    if (ev.key === "ArrowUp") {
      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionEnd = ev.currentTarget.selectionEnd || 0;
        if (selectionEnd === 0) {
          ev.currentTarget.selectionStart = 0;
          ev.currentTarget.selectionEnd = length;
          ev.preventDefault();
        }
      }
    }

    if (ev.key === "ArrowDown" && !ev.shiftKey) {
      ev.preventDefault();

      if (ev.currentTarget.value) {
        const length = ev.currentTarget.value.length;
        const selectionStart = ev.currentTarget.selectionStart || 0;
        if (selectionStart < length) {
          ev.currentTarget.selectionStart = length;
          ev.currentTarget.selectionEnd = length;
          return;
        }
      }

      if (this.compositeRef) {
        const linkItems = this.compositeRef.querySelectorAll(
          "[href]"
        ) as NodeListOf<HTMLAnchorElement>;
        linkItems[0]?.focus();
      }
    }
  };

  handleQueryChange = () => {
    this.params = new URLSearchParams(this.props.location.search);
    this.offset = 0;
    this.allowLoadMore = true;
    // To prevent "no results" showing before debounce kicks in
    this.isLoading = true;
    this.fetchResults();
  };

  handleTermChange = () => {
    const query = decodeURIComponentSafe(this.props.match.params.term || "");
    this.query = query ? query : "";
    this.offset = 0;
    this.allowLoadMore = true;
    // To prevent "no results" showing before debounce kicks in
    this.isLoading = true;
    this.fetchResults();
  };

  handleFilterChange = (search: {
    collectionId?: string | undefined;
    userId?: string | undefined;
    dateFilter?: TDateFilter;
    includeArchived?: boolean | undefined;
    titleFilter?: boolean | undefined;
  }) => {
    this.props.history.replace({
      pathname: this.props.location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(this.props.location.search), ...search },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  handleTitleFilterChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    this.handleFilterChange({ titleFilter: ev.target.checked });
  };

  get includeArchived() {
    return this.params.get("includeArchived") === "true";
  }

  get collectionId() {
    const id = this.params.get("collectionId");
    return id ? id : undefined;
  }

  get userId() {
    const id = this.params.get("userId");
    return id ? id : undefined;
  }

  get dateFilter() {
    const id = this.params.get("dateFilter");
    return id ? (id as TDateFilter) : undefined;
  }

  get titleFilter() {
    return this.params.get("titleFilter") === "true";
  }

  get isFiltered() {
    return (
      this.dateFilter ||
      this.userId ||
      this.collectionId ||
      this.includeArchived ||
      this.titleFilter
    );
  }

  get title() {
    const query = this.query;
    const title = this.props.t("Search");
    if (query) {
      return `${query} – ${title}`;
    }
    return title;
  }

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isLoading) {
      return;
    }

    // Fetch more results
    await this.fetchResults();
  };

  @action
  fetchResults = async () => {
    if (this.query.trim()) {
      const params = {
        offset: this.offset,
        limit: DEFAULT_PAGINATION_LIMIT,
        dateFilter: this.dateFilter,
        includeArchived: this.includeArchived,
        includeDrafts: true,
        collectionId: this.collectionId,
        userId: this.userId,
        titleFilter: this.titleFilter,
      };

      // we just requested this thing – no need to try again
      if (this.lastQuery === this.query && isEqual(params, this.lastParams)) {
        this.isLoading = false;
        return;
      }

      this.isLoading = true;
      this.lastQuery = this.query;
      this.lastParams = params;

      try {
        const results = this.titleFilter
          ? await this.props.documents.searchTitles(this.query, params)
          : await this.props.documents.search(this.query, params);

        // Add to the searches store so this search can immediately appear in
        // the recent searches list without a flash of load
        this.props.searches.add({
          id: uuidv4(),
          query: this.query,
          createdAt: new Date().toISOString(),
        });

        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } catch (error) {
        Logger.error("Search query failed", error);
        this.lastQuery = "";
      } finally {
        this.isLoading = false;
      }
    } else {
      this.isLoading = false;
      this.lastQuery = this.query;
    }
  };

  updateLocation = (query: string) => {
    this.props.history.replace({
      pathname: searchPath(query),
      search: this.props.location.search,
    });
  };

  setCompositeRef = (ref: HTMLDivElement | null) => {
    this.compositeRef = ref;
  };

  setSearchInputRef = (ref: HTMLInputElement | null) => {
    this.searchInputRef = ref;
  };

  handleEscape = () => {
    this.searchInputRef?.focus();
  };

  render() {
    const { documents, notFound, t } = this.props;
    const results = documents.searchResults(this.query);
    const showEmpty = !this.isLoading && this.query && results?.length === 0;

    return (
      <Scene textTitle={this.title}>
        <RegisterKeyDown trigger="Escape" handler={this.goBack} />
        {this.isLoading && <LoadingIndicator />}
        {notFound && (
          <div>
            <h1>{t("Not Found")}</h1>
            <Empty>
              {t("We were unable to find the page you’re looking for.")}
            </Empty>
          </div>
        )}
        <ResultsWrapper column auto>
          <SearchInput
            ref={this.setSearchInputRef}
            placeholder={`${t("Search")}…`}
            onKeyDown={this.handleKeyDown}
            defaultValue={this.query}
          />

          {this.query ? (
            <Filters>
              <StatusFilter
                includeArchived={this.includeArchived}
                onSelect={(includeArchived) =>
                  this.handleFilterChange({
                    includeArchived,
                  })
                }
              />
              <CollectionFilter
                collectionId={this.collectionId}
                onSelect={(collectionId) =>
                  this.handleFilterChange({
                    collectionId,
                  })
                }
              />
              <UserFilter
                userId={this.userId}
                onSelect={(userId) =>
                  this.handleFilterChange({
                    userId,
                  })
                }
              />
              <DateFilter
                dateFilter={this.dateFilter}
                onSelect={(dateFilter) =>
                  this.handleFilterChange({
                    dateFilter,
                  })
                }
              />
              <SearchTitlesFilter
                width={26}
                height={14}
                label={t("Search titles only")}
                onChange={this.handleTitleFilterChange}
                checked={this.titleFilter}
              />
            </Filters>
          ) : (
            <RecentSearches />
          )}
          {showEmpty && (
            <Fade>
              <Centered column>
                <Text type="secondary">
                  <Trans>No documents found for your search filters.</Trans>
                </Text>
              </Centered>
            </Fade>
          )}
          <ResultList column>
            <StyledArrowKeyNavigation
              ref={this.setCompositeRef}
              onEscape={this.handleEscape}
              aria-label={t("Search Results")}
            >
              {(compositeProps) =>
                results?.map((result) => {
                  const document = documents.data.get(result.document.id);
                  if (!document) {
                    return null;
                  }
                  return (
                    <DocumentListItem
                      key={document.id}
                      document={document}
                      highlight={this.query}
                      context={result.context}
                      showCollection
                      showTemplate
                      {...compositeProps}
                    />
                  );
                })
              }
            </StyledArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
            )}
          </ResultList>
        </ResultsWrapper>
      </Scene>
    );
  }
}

const Centered = styled(Flex)`
  text-align: center;
  margin: 30vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const ResultsWrapper = styled(Flex)`
  ${breakpoint("tablet")`
    margin-top: 40px;
  `};
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Filters = styled(Flex)`
  margin-bottom: 12px;
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  overflow-y: hidden;
  overflow-x: auto;
  padding: 8px 0;

  ${breakpoint("tablet")`
    padding: 0;
  `};

  &: ${hover} {
    opacity: 1;
  }
`;

const SearchTitlesFilter = styled(Switch)`
  white-space: nowrap;
  margin-left: 8px;
  margin-top: 2px;
  font-size: 14px;
  font-weight: 500;
`;

export default withTranslation()(withStores(withRouter(Search)));
