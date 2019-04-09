// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import keydown from 'react-keydown';
import Waypoint from 'react-waypoint';
import { withRouter } from 'react-router-dom';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { debounce } from 'lodash';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import DocumentsStore from 'stores/DocumentsStore';
import { searchUrl } from 'utils/routeHelpers';
import { meta } from 'utils/keyboard';

import Flex from 'shared/components/Flex';
import Empty from 'components/Empty';
import Fade from 'components/Fade';
import Checkbox from 'components/Checkbox';

import HelpText from 'components/HelpText';
import CenteredContent from 'components/CenteredContent';
import LoadingIndicator from 'components/LoadingIndicator';
import DocumentPreview from 'components/DocumentPreview';
import PageTitle from 'components/PageTitle';
import SearchField from './components/SearchField';

type Props = {
  history: Object,
  match: Object,
  location: Object,
  documents: DocumentsStore,
  notFound: ?boolean,
};

@observer
class Search extends React.Component<Props> {
  firstDocument: ?DocumentPreview;

  @observable query: string = '';
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;
  @observable isFetching: boolean = false;
  @observable includeArchived: boolean = false;
  @observable pinToTop: boolean = !!this.props.match.params.query;

  componentDidMount() {
    this.handleQueryChange();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.query !== this.props.match.params.query) {
      this.handleQueryChange();
    }
  }

  @keydown('esc')
  goBack() {
    this.props.history.goBack();
  }

  handleKeyDown = ev => {
    // Escape
    if (ev.which === 27) {
      ev.preventDefault();
      this.goBack();
    }

    // Down
    if (ev.which === 40) {
      ev.preventDefault();
      if (this.firstDocument) {
        const element = ReactDOM.findDOMNode(this.firstDocument);
        if (element instanceof HTMLElement) element.focus();
      }
    }
  };

  handleQueryChange = () => {
    const query = this.props.match.params.query;
    this.query = query ? query : '';
    this.offset = 0;
    this.allowLoadMore = true;

    // To prevent "no results" showing before debounce kicks in
    this.isFetching = !!this.query;

    this.fetchResultsDebounced();
  };

  handleFilterChange = ev => {
    this.includeArchived = ev.target.checked;
    this.fetchResultsDebounced();
  };

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;

    // Fetch more results
    await this.fetchResults();
  };

  @action
  fetchResults = async () => {
    if (this.query) {
      this.isFetching = true;

      try {
        const results = await this.props.documents.search(this.query, {
          offset: this.offset,
          limit: DEFAULT_PAGINATION_LIMIT,
          includeArchived: this.includeArchived,
        });

        if (results.length > 0) this.pinToTop = true;
        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } finally {
        this.isFetching = false;
      }
    } else {
      this.pinToTop = false;
    }
  };

  fetchResultsDebounced = debounce(this.fetchResults, 350, {
    leading: false,
    trailing: true,
  });

  updateLocation = query => {
    this.props.history.replace(searchUrl(query));
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  get title() {
    const query = this.query;
    const title = 'Search';
    if (query) return `${query} - ${title}`;
    return title;
  }

  render() {
    const { documents, notFound, location } = this.props;
    const results = documents.searchResults(this.query);
    const showEmpty = !this.isFetching && this.query && results.length === 0;
    const showShortcutTip =
      !this.pinToTop && location.state && location.state.fromMenu;

    return (
      <Container auto>
        <PageTitle title={this.title} />
        {this.isFetching && <LoadingIndicator />}
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
              <Checkbox
                label="Include archived"
                name="includeArchived"
                checked={this.includeArchived}
                onChange={this.handleFilterChange}
                small
              />
            </Filters>
          )}
          {showEmpty && <Empty>No matching documents.</Empty>}
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
                    ref={ref => index === 0 && this.setFirstDocumentRef(ref)}
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

const Container = styled(CenteredContent)`
  > div {
    position: relative;
    height: 100%;
  }
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 300ms cubic-bezier(0.65, 0.05, 0.36, 1);
  top: ${props => (props.pinToTop ? '0%' : '50%')};
  margin-top: ${props => (props.pinToTop ? '40px' : '-75px')};
  width: 100%;
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
  opacity: ${props => (props.visible ? '1' : '0')};
  transition: all 400ms cubic-bezier(0.65, 0.05, 0.36, 1);
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Filters = styled(Flex)`
  border-bottom: 1px solid ${props => props.theme.divider};
  margin-bottom: 10px;
`;

export default withRouter(inject('documents')(Search));
