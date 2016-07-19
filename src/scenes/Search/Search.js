import React from 'react';
import { observer } from 'mobx-react';
import _debounce from 'lodash/debounce';

import Flex from 'components/Flex';
import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';
import SearchField from './components/SearchField';
import DocumentPreview from 'components/DocumentPreview';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';

import styles from './Search.scss';

import SearchStore from './SearchStore';

@observer
class Search extends React.Component {
  static store;

  constructor(props) {
    super(props);
    this.store = new SearchStore();
  }

  render() {
    const search = _debounce((searchTerm) => {
      this.store.search(searchTerm);
    }, 250);

    return (
      <Layout
        title="Search"
        titleText="Search"
        search={ false }
        loading={ this.store.isFetching }
      >
        <CenteredContent>
          <Flex direction="column" flex={ true }>
            <Flex flex={ true }>
              <img
                src={ require('assets/icons/search.svg') }
                className={ styles.icon }
              />
              <SearchField
                searchTerm={ this.store.searchTerm }
                onChange={ search }
              />
            </Flex>
            { this.store.documents && this.store.documents.map((document) => {
             return  (<DocumentPreview key={ document.id } document={ document } />);
            }) }
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Search;
