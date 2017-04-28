import React, { PropTypes } from 'react';
import { observer } from 'mobx-react';
import _ from 'lodash';

import { Flex } from 'reflexbox';
import Layout, { Title } from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SearchField from './components/SearchField';
import DocumentPreview from 'components/DocumentPreview';

import styles from './Search.scss';

import SearchStore from './SearchStore';

@observer class Search extends React.Component {
  static propTypes = {
    route: PropTypes.object.isRequired,
    routeParams: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.store = new SearchStore();
  }

  componentDidMount = () => {
    const { splat } = this.props.routeParams;
    if (this.viewNotFound) {
      let searchTerm = _.last(splat.split('/'));
      searchTerm = searchTerm.split(/[\s-]+/gi).join(' ');
      this.store.search(searchTerm);
    }
  };

  get viewNotFound() {
    const { sceneType } = this.props.route;
    return sceneType === 'notFound';
  }

  render() {
    const search = _.debounce(searchTerm => {
      this.store.search(searchTerm);
    }, 250);
    const title = (
      <Title>
        Search
      </Title>
    );

    return (
      <Layout
        title={title}
        titleText="Search"
        search={false}
        loading={this.store.isFetching}
      >
        <CenteredContent>
          {this.viewNotFound &&
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
                onChange={search}
              />
            </Flex>
            {this.store.documents &&
              this.store.documents.map(document => {
                return (
                  <DocumentPreview key={document.id} document={document} />
                );
              })}
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Search;
