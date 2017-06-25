// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

import SidebarLink from '../SidebarLink';

import Collection from 'models/Collection';

type Props = {
  collection: Collection,
};

const SidebarCollection = ({ collection }: Props) => {
  if (collection) {
    return (
      <Flex column>
        <Header>{collection.name}</Header>
        {collection.documents.map(document => (
          <SidebarLink key={document.id} to={document.url}>
            {document.title}
          </SidebarLink>
        ))}
      </Flex>
    );
  }
  return null;
};

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9FA6AB;
  letter-spacing: 0.04em;
`;

export default observer(SidebarCollection);
