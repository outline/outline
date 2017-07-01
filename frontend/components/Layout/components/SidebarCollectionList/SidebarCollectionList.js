// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

import SidebarLink from '../SidebarLink';
import DropToCollection from '../DropToCollection';

import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
};

const SidebarCollectionList = observer(({ history, collections }: Props) => {
  return (
    <Flex column>
      <Header>Collections</Header>
      {collections.data.map(collection => (
        <SidebarLink key={collection.id} to={collection.url}>
          <DropToCollection history={history} collectionId={collection.id}>
            {collection.name}
          </DropToCollection>
        </SidebarLink>
      ))}
    </Flex>
  );
});

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9FA6AB;
  letter-spacing: 0.04em;
`;

export default inject('collections')(SidebarCollectionList);
