// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';

import CollectionsStore from 'stores/CollectionsStore';
import PageTitle from 'components/PageTitle';
import Collection from 'components/Collection';
import CenteredContent from 'components/CenteredContent';
import PreviewLoading from 'components/PreviewLoading';

type Props = {
  collections: CollectionsStore,
};

@observer class Dashboard extends React.Component {
  props: Props;

  render() {
    const { collections } = this.props;

    return (
      <CenteredContent>
        <PageTitle title="Home" />
        <h1>Home</h1>
        <Flex column auto>
          {!collections.isLoaded
            ? <PreviewLoading />
            : collections.data.map(collection => (
                <Collection key={collection.id} data={collection} />
              ))}
        </Flex>
      </CenteredContent>
    );
  }
}

export default inject('collections')(Dashboard);
