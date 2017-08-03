// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import Flex from 'components/Flex';
import styled from 'styled-components';
import { layout } from 'styles/constants';

import SidebarLink from '../SidebarLink';
import DropToImport from 'components/DropToImport';

import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
};

const activeStyle = {
  color: '#000',
  background: '#E1E1E1',
};

const SidebarCollectionList = observer(({ history, collections }: Props) => {
  return (
    <Flex column>
      <Header>Collections</Header>
      {collections.data.map(collection => (
        <DropToImport
          key={collection.id}
          history={history}
          collectionId={collection.id}
          activeStyle={activeStyle}
        >
          <SidebarLink key={collection.id} to={collection.entryUrl}>
            {collection.name}
          </SidebarLink>
        </DropToImport>
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
  padding: 0 ${layout.hpadding};
`;

export default inject('collections')(SidebarCollectionList);
