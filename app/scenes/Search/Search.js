// @flow
import ArrowKeyNavigation from "boundless-arrow-key-navigation";
import { debounce } from "lodash";
import { observable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import ReactDOM from "react-dom";
import keydown from "react-keydown";
import { withRouter, Link } from "react-router-dom";
import type { RouterHistory, Match } from "react-router-dom";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

import { DEFAULT_PAGINATION_LIMIT } from "stores/BaseStore";
import DocumentsStore from "stores/DocumentsStore";
import UsersStore from "stores/UsersStore";

import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import DocumentPreview from "components/DocumentPreview";
import Empty from "components/Empty";
import Fade from "components/Fade";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import LoadingIndicator from "components/LoadingIndicator";
import PageTitle from "components/PageTitle";
import CollectionFilter from "./components/CollectionFilter";
import DateFilter from "./components/DateFilter";
import SearchField from "./components/SearchField";
import StatusFilter from "./components/StatusFilter";
import UserFilter from "./components/UserFilter";
import NewDocumentMenu from "menus/NewDocumentMenu";
import { type LocationWithState } from "types";
import { meta } from "utils/keyboard";
import { newDocumentUrl, searchUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  match: Match,
  location: LocationWithState,
  documents: DocumentsStore,
  users: UsersStore,
  notFound: ?boolean,
};

@observer
class Search extends React.Component<Props> {
  firstDocument: ?React.Component<typeof DocumentPreview>;
  lastQuery: string = "";

  @observable
  query: string = decodeURIComponent(this.props.match.params.term || "");
  @observable params: URLSearchParams = new URLSearchParams();
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;
  @observable isLoading: boolean = false;
  @observable pinToTop: boolean = !!this.props.match.params.term;

  componentDidMount() {
    this.handleTermChange();

    if (this.props.location.search) {
      this.handleQueryChange();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      this.handleQueryChange();
    }
    if (prevProps.match.params.term !== this.props.match.params.term) {
      this.handleTermChange();
    }
  }

  @keydown("esc")
  goBack() {
    this.props.history.goBack();
  }

  handleKeyDown = (ev) => {
    if (ev.key === "Enter") {
      this.fetchResults();
      return;
    }

    if (ev.key === "Escape") {
      ev.preventDefault();
      return this.goBack();
    }

    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (this.firstDocument) {
        const element = ReactDOM.findDOMNode(this.firstDocument);
        if (element instanceof HTMLElement) element.focus();
      }
    }
  };

  handleQueryChange = () => {
    this.params = new URLSearchParams(this.props.location.search);
    this.offset = 0;
    this.allowLoadMore = true;

    // To prevent "no results" showing before debounce kicks in
    this.isLoading = true;

    this.fetchResultsDebounced();
  };

  handleTermChange = () => {
    const query = decodeURIComponent(this.props.match.params.term || "");
    this.query = query ? query : "";
    this.offset = 0;
    this.allowLoadMore = true;

    // To prevent "no results" showing before debounce kicks in
    this.isLoading = !!this.query;

    this.fetchResultsDebounced();
  };

  handleFilterChange = (search) => {
    this.props.history.replace({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        ...search,
      }),
    });
  };

  handleNewDoc = () => {
    if (this.collectionId) {
      this.props.history.push(newDocumentUrl(this.collectionId));
    }
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
    return id ? id : undefined;
  }

  get isFiltered() {
    return (
      this.dateFilter ||
      this.userId ||
      this.collectionId ||
      this.includeArchived
    );
  }

  get title() {
    const query = this.query;
    const title = "Search";
    if (query) return `${query} – ${title}`;
    return title;
  }

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isLoading) return;

    // Fetch more results
    await this.fetchResults();
  };

  @action
  fetchResults = async () => {
    if (this.query) {
      // we just requested this thing – no need to try again
      if (this.lastQuery === this.query) {
        this.isLoading = false;
        return;
      }

      this.isLoading = true;
      this.lastQuery = this.query;

      try {
        const results = await this.props.documents.search(this.query, {
          offset: this.offset,
          limit: DEFAULT_PAGINATION_LIMIT,
          dateFilter: this.dateFilter,
          includeArchived: this.includeArchived,
          includeDrafts: true,
          collectionId: this.collectionId,
          userId: this.userId,
        });

        this.pinToTop = true;

        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } catch (err) {
        this.lastQuery = "";
        throw err;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.pinToTop = false;
      this.lastQuery = this.query;
    }
  };

  fetchResultsDebounced = debounce(this.fetchResults, 500, {
    leading: false,
    trailing: true,
  });

  updateLocation = (query) => {
    this.props.history.replace({
      pathname: searchUrl(query),
      search: this.props.location.search,
    });
  };

  setFirstDocumentRef = (ref) => {
    // $FlowFixMe
    this.firstDocument = ref;
  };

  render() {
    const { documents, notFound, location } = this.props;
    const results = documents.searchResults(this.query);
    const showEmpty = !this.isLoading && this.query && results.length === 0;
    const showShortcutTip =
      !this.pinToTop && location.state && location.state.fromMenu;

    return (
      <Container auto>
        <PageTitle title={this.title} />
        {this.isLoading && <LoadingIndicator />}
        {notFound && (
          <div>
            <h1>Not Found</h1>
            <Empty>We were unable to find the page you’re looking for.</Empty>
          </div>
        )}
        <ResultsWrapper pinToTop={this.pinToTop} column auto>
          <SearchField
            onKeyDown={this.handleKeyDown}
            onChange={this.updateLocation}
            defaultValue={this.query}
          />
          {showShortcutTip && (
            <Fade>
              <HelpText small>
                Use the <strong>{meta}+K</strong> shortcut to search from
                anywhere in Outline
              </HelpText>
            </Fade>
          )}
          {this.pinToTop && (
            <Filters>
              <StatusFilter
                includeArchived={this.includeArchived}
                onSelect={(includeArchived) =>
                  this.handleFilterChange({ includeArchived })
                }
              />
              <CollectionFilter
                collectionId={this.collectionId}
                onSelect={(collectionId) =>
                  this.handleFilterChange({ collectionId })
                }
              />
              <UserFilter
                userId={this.userId}
                onSelect={(userId) => this.handleFilterChange({ userId })}
              />
              <DateFilter
                dateFilter={this.dateFilter}
                onSelect={(dateFilter) =>
                  this.handleFilterChange({ dateFilter })
                }
              />
            </Filters>
          )}
          {showEmpty && (
            <Fade>
              <Empty>
                <Centered column>
                  <HelpText>
                    No documents found for your search filters. <br />
                    Create a new document?
                  </HelpText>
                  <Wrapper>
                    {this.collectionId ? (
                      <Button
                        onClick={this.handleNewDoc}
                        icon={<PlusIcon />}
                        primary
                      >
                        New doc
                      </Button>
                    ) : (
                      <NewDocumentMenu />
                    )}
                    &nbsp;&nbsp;
                    <Button as={Link} to="/search" neutral>
                      Clear filters
                    </Button>
                  </Wrapper>
                </Centered>
              </Empty>
            </Fade>
          )}
          <ResultList column visible={this.pinToTop}>
            <StyledArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {results.map((result, index) => {
                const document = documents.data.get(result.document.id);
                if (!document) return null;

                return (
                  <DocumentPreview
                    ref={(ref) => index === 0 && this.setFirstDocumentRef(ref)}
                    key={document.id}
                    document={document}
                    highlight={this.query}
                    context={result.context}
                    showCollection
                  />
                );
              })}
            </StyledArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
            )}
          </ResultList>
        </ResultsWrapper>
      </Container>
    );
  }
}

const Wrapper = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

const Centered = styled(Flex)`
  text-align: center;
  margin: 30vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const Container = styled(CenteredContent)`
  > div {
    position: relative;
    height: 100%;
  }
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 300ms cubic-bezier(0.65, 0.05, 0.36, 1);
  top: ${(props) => (props.pinToTop ? "0%" : "50%")};
  margin-top: ${(props) => (props.pinToTop ? "40px" : "-75px")};
  width: 100%;
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
  opacity: ${(props) => (props.visible ? "1" : "0")};
  transition: all 400ms cubic-bezier(0.65, 0.05, 0.36, 1);
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
  overflow-y: auto;
  padding: 8px 0;

  ${breakpoint("tablet")`	
    padding: 0;
  `};

  &:hover {
    opacity: 1;
  }
`;

export default withRouter(inject("documents")(Search));
