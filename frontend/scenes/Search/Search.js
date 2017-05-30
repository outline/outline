// @flow
import React from 'react';
import { observer } from 'mobx-react';
import _ from 'lodash';
import { Flex } from 'reflexbox';
import { withRouter } from 'react-router';
import { searchUrl } from 'utils/routeHelpers';

import SearchField from './components/SearchField';
import styles from './Search.scss';
import SearchStore from './SearchStore';

import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import DocumentPreview from 'components/DocumentPreview';
import PageTitle from 'components/PageTitle';

type Props = {
  history: Object,
  match: Object,
  notFound: ?boolean,
};

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

    return (
      <Layout title={title} search={false} loading={this.store.isFetching}>
        <PageTitle title="Search" />
        <CenteredContent>
          {this.props.notFound &&
            <div>
              <h1>Not Found</h1>
              <p>We're unable to find the page you're accessing.</p>
              <hr />
            </div>}

          <Flex column auto>
            <Flex auto>
              <img
                src={require('assets/icons/search.svg')}
                className={styles.icon}
                alt="Search"
              />
              <SearchField
                searchTerm={this.store.searchTerm}
                onKeyDown={this.handleKeyDown}
                onChange={this.updateQuery}
                value={query}
              />
            </Flex>
            {this.store.documents.map(document => (
              <DocumentPreview key={document.id} document={document} />
            ))}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default withRouter(Search);
