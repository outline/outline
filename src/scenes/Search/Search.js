import React from 'react';
import { observer } from 'mobx-react';

import Flex from 'components/Flex';
import Layout from 'components/Layout';
import CenteredContent from 'components/CenteredContent';

@observer
class Search extends React.Component {
  render() {
    return (
      <Layout
        title="Search"
        titleText="Search"
        search={ false }
      >
        <CenteredContent>
          <Flex direction="column" flex={ true }>
            TBA
          </Flex>
        </CenteredContent>
      </Layout>
    );
  }
}

export default Search;
