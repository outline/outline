// @flow
import React from 'react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';

import SidebarLink from '../SidebarLink';

import Collection from 'models/Collection';
import Document from 'models/Document';
import type { NavigationNode } from 'types';

type Props = {
  collection: ?Collection,
  document: ?Document,
};

class SidebarCollection extends React.Component {
  props: Props;

  renderDocuments(documentList: Array<NavigationNode>) {
    const { document } = this.props;

    if (document) {
      return documentList.map(doc => (
        <Flex column key={doc.id}>
          <SidebarLink key={doc.id} to={doc.url}>
            {doc.title}
          </SidebarLink>
          {(document.pathToDocument.includes(doc.id) ||
            document.id === doc.id) &&
            <Children>
              {doc.children && this.renderDocuments(doc.children)}
            </Children>}
        </Flex>
      ));
    }
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

export default SidebarCollection;
