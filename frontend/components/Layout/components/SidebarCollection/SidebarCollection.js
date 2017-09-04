// @flow
import React from 'react';
import { observer } from 'mobx-react';
import Flex from 'components/Flex';
import styled from 'styled-components';
import { color, layout } from 'styles/constants';
import SidebarLink from '../SidebarLink';
import DropToImport from 'components/DropToImport';

import Collection from 'models/Collection';
import Document from 'models/Document';
import type { NavigationNode } from 'types';

type Props = {
  collection: ?Collection,
  document: ?Document,
  history: Object,
};

const activeStyle = {
  color: '#000',
  background: '#E1E1E1',
};

@observer class SidebarCollection extends React.Component {
  props: Props;

  renderDocuments(documentList: Array<NavigationNode>, depth: number = 0) {
    const { document, history } = this.props;
    const canDropToImport = depth === 0;

    if (document) {
      return documentList.map(doc => (
        <Flex column key={doc.id}>
          {canDropToImport &&
            <DropToImport
              history={history}
              documentId={doc.id}
              activeStyle={activeStyle}
            >
              <SidebarLink to={doc.url}>{doc.title}</SidebarLink>
            </DropToImport>}
          {!canDropToImport &&
            <SidebarLink to={doc.url}>{doc.title}</SidebarLink>}

          {(document.pathToDocument.includes(doc.id) ||
            document.id === doc.id) &&
            <Children column>
              {doc.children && this.renderDocuments(doc.children, depth + 1)}
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
  color: ${color.slate};
  letter-spacing: 0.04em;
  padding: 0 ${layout.hpadding};
`;

const Children = styled(Flex)`
  margin-left: 20px;
`;

export default SidebarCollection;
