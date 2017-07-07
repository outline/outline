// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import Flex from 'components/Flex';
import styled from 'styled-components';

import SidebarLink from '../SidebarLink';

import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  collections: CollectionsStore,
};

const SidebarCollectionList = observer(({ collections }: Props) => {
  return (
    <Flex column>
      <Header>Collections</Header>
      {collections.data.map(collection => (
        <SidebarLink key={collection.id} to={collection.url}>
          {collection.name}
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
