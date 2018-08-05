// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import keydown from 'react-keydown';
import Waypoint from 'react-waypoint';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { SearchResult } from 'types';
import _ from 'lodash';
import DocumentsStore, {
  DEFAULT_PAGINATION_LIMIT,
} from 'stores/DocumentsStore';

import { withRouter } from 'react-router-dom';
import { searchUrl } from 'utils/routeHelpers';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import Empty from 'components/Empty';
import Flex from 'shared/components/Flex';
import CenteredContent from 'components/CenteredContent';
import LoadingIndicator from 'components/LoadingIndicator';
import SearchField from './components/SearchField';

import DocumentPreview from 'components/DocumentPreview';
import PageTitle from 'components/PageTitle';

type Props = {
  history: Object,
  match: Object,
  documents: DocumentsStore,
  notFound: ?boolean,
};

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

@observer
class Search extends React.Component<Props> {
  firstDocument: HTMLElement;

  @observable results: SearchResult[] = [];
  @observable query: string = '';
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;
  @observable isFetching: boolean = false;
  @observable pinToTop: boolean = false;

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
    this.results = [];
    this.offset = 0;
    this.allowLoadMore = true;

    // To prevent "no results" showing before debounce kicks in
    if (this.query) this.isFetching = true;

    this.fetchResultsDebounced();
  };

  fetchResultsDebounced = _.debounce(this.fetchResults, 350, {
    leading: false,
    trailing: true,
  });

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;

    // Fetch more results
    await this.fetchResults();
  };

  @action
  fetchResults = async () => {
    this.isFetching = true;

    if (this.query) {
      try {
        const results = await this.props.documents.search(this.query, {
          offset: this.offset,
          limit: DEFAULT_PAGINATION_LIMIT,
        });
        this.results = this.results.concat(results);

        if (this.results.length > 0) this.pinToTop = true;
        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } catch (e) {
        console.error('Something went wrong');
      }
    } else {
      this.results = [];
      this.pinToTop = false;
    }

    this.isFetching = false;
  };

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
    const { documents, notFound } = this.props;
    const showEmpty =
      !this.isFetching && this.query && this.results.length === 0;

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
            value={this.query}
          />
          {showEmpty && <Empty>No matching documents.</Empty>}
          <ResultList column visible={this.pinToTop}>
            <StyledArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {this.results.map((result, index) => {
                const document = documents.getById(result.document.id);
                if (!document) return null;

                return (
                  <DocumentPreview
                    innerRef={ref =>
                      index === 0 && this.setFirstDocumentRef(ref)
                    }
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

export default withRouter(inject('documents')(Search));
