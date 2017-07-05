// @flow
import React from 'react';
import ReactDOM from 'react-dom';
import { observer } from 'mobx-react';
import _ from 'lodash';
import Flex from 'components/Flex';
import { withRouter } from 'react-router';
import { searchUrl } from 'utils/routeHelpers';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import SearchField from './components/SearchField';
import SearchStore from './SearchStore';

import CenteredContent from 'components/CenteredContent';
import DocumentPreview from 'components/DocumentPreview';
import PageTitle from 'components/PageTitle';

type Props = {
  history: Object,
  match: Object,
  notFound: ?boolean,
};

const Container = styled(CenteredContent)`
  position: relative;
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 200ms ease-in-out;
  top: ${props => (props.pinToTop ? '0%' : '50%')};
  margin-top: ${props => (props.pinToTop ? '40px' : '-75px')};
  width: 100%;
`;

@observer class Search extends React.Component {
  firstDocument: HTMLElement;
  props: Props;
  store: SearchStore;

  constructor(props: Props) {
    super(props);
    this.store = new SearchStore();
    this.updateSearchResults();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.match.params.query !== this.props.match.params.query) {
      this.updateSearchResults();
    }
  }

  handleKeyDown = ev => {
    // ESC
    if (ev.which === 27) {
      ev.preventDefault();
      this.props.history.goBack();
    }
    // Down
    if (ev.which === 40) {
      ev.preventDefault();
      if (this.firstDocument) {
        const element = ReactDOM.findDOMNode(this.firstDocument);
        // $FlowFixMe
        if (element && element.focus) element.focus();
      }
    }
  };

  updateSearchResults = _.debounce(() => {
    this.store.search(this.props.match.params.query);
  }, 250);

  updateQuery = query => {
    this.props.history.replace(searchUrl(query));
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  render() {
    const query = this.props.match.params.query;
    const hasResults = this.store.documents.length > 0;

    return (
      <Container auto>
        <PageTitle title="Search" />
        {this.props.notFound &&
          <div>
            <h1>Not Found</h1>
            <p>We're unable to find the page you're accessing.</p>
            <hr />
          </div>}
        <ResultsWrapper pinToTop={hasResults} column auto>
          <SearchField
            searchTerm={this.store.searchTerm}
            onKeyDown={this.handleKeyDown}
            onChange={this.updateQuery}
            value={query || ''}
          />
          <ArrowKeyNavigation
            mode={ArrowKeyNavigation.mode.VERTICAL}
            defaultActiveChildIndex={0}
          >
            {this.store.documents.map((document, index) => (
              <DocumentPreview
                innerRef={ref => index === 0 && this.setFirstDocumentRef(ref)}
                key={document.id}
                document={document}
                highlight={this.store.searchTerm}
              />
            ))}
          </ArrowKeyNavigation>
        </ResultsWrapper>
      </Container>
    );
  }
}

export default withRouter(Search);
