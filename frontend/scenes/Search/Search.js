// @flow
import React from 'react';
import { observer } from 'mobx-react';
import _ from 'lodash';
import { Flex } from 'reflexbox';
import { withRouter } from 'react-router';
import { searchUrl } from 'utils/routeHelpers';
import styled from 'styled-components';

import SearchField from './components/SearchField';
import SearchStore from './SearchStore';

import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import DocumentPreview from 'components/DocumentPreview';

type Props = {
  history: Object,
  match: Object,
  notFound: ?boolean,
};

const Container = styled(CenteredContent)`
  position: relative;
  min-height: 100%;
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 200ms ease-in-out;
  top: ${props => (props.pinToTop ? '0%' : '50%')};
  margin-top: ${props => (props.pinToTop ? '40px' : '-50px')};
`;

@observer class Search extends React.Component {
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
    if (ev.which === 27) {
      ev.preventDefault();
      this.props.history.goBack();
    }
  };

  updateSearchResults = _.debounce(() => {
    this.store.search(this.props.match.params.query);
  }, 250);

  updateQuery = query => {
    this.props.history.replace(searchUrl(query));
  };

  render() {
    const query = this.props.match.params.query;
    const title = <Title content="Search" />;
    const hasResults = this.store.documents.length > 0;

    return (
      <Layout
        title={title}
        titleText="Search"
        search={false}
        loading={this.store.isFetching}
      >
        <Container>
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
            {this.store.documents.map(document => (
              <DocumentPreview key={document.id} document={document} />
            ))}
          </ResultsWrapper>
        </Container>
      </Layout>
    );
  }
}

export default withRouter(Search);
