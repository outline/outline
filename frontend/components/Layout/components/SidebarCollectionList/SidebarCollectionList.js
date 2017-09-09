// @flow
import React from 'react';
import { observer, inject } from 'mobx-react';
import Flex from 'components/Flex';
import styled from 'styled-components';
import { color, layout, fontWeight } from 'styles/constants';

import SidebarLink from '../SidebarLink';
import DropToImport from 'components/DropToImport';

import CollectionsStore from 'stores/CollectionsStore';

type Props = {
  history: Object,
  collections: CollectionsStore,
};

const activeStyle = {
  color: color.black,
  background: color.slateDark,
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
  font-weight: ${fontWeight.semiBold};
  text-transform: uppercase;
  color: ${color.slate};
  letter-spacing: 0.04em;
  padding: 0 ${layout.hpadding};
`;

export default inject('collections')(SidebarCollectionList);
