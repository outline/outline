// @flow
import React from 'react';
import { observer } from 'mobx-react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

import SidebarLink from '../SidebarLink';

import Collection from 'models/Collection';

type Props = {
  collection: ?Collection,
  document: ?Document,
};

class SidebarCollection extends React.Component {
  props: Props;

  renderDocuments(documentList) {
    return documentList.map(document => (
      <Flex column key={document.id}>
        <SidebarLink key={document.id} to={document.url}>
          {document.title}
        </SidebarLink>
        <Children>
          {document.children && this.renderDocuments(document.children)}
        </Children>
      </Flex>
    ));
  }

  render() {
    const { collection } = this.props;

    if (collection) {
      return (
        <Flex column>
          <Header>{collection.name}</Header>
          {this.renderDocuments(collection.documents)}
        </Flex>
      );
    }
    return null;
  }
}

const Header = styled(Flex)`
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  color: #9FA6AB;
  letter-spacing: 0.04em;
`;

const Children = styled(Flex)`
  margin-left: 20px;
`;

export default observer(SidebarCollection);
