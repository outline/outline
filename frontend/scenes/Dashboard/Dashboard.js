// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';

import AtlasPreview from 'components/AtlasPreview';
import ContentLoading from 'components/ContentLoading';
import CenteredContent from 'components/CenteredContent';

import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  collections: CollectionsStore,
};

@observer class Dashboard extends React.Component {
  props: Props;

  renderCollections() {
    const { collections } = this.props;

    return (
      <Flex column>
        <Flex column>
          {collections.data.map(collection => {
            return <AtlasPreview key={collection.id} data={collection} />;
          })}
        </Flex>
      </Flex>
    );
  }

  render() {
    const { isLoaded } = this.props.collections;

    return (
      <CenteredContent>
        <Flex column auto>
          {!isLoaded ? <ContentLoading /> : this.renderCollections()}
        </Flex>
      </CenteredContent>
    );
  }
}

export default inject('collections')(Dashboard);
