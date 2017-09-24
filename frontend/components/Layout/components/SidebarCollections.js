// @flow
import React from 'react';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import Flex from 'components/Flex';
import styled from 'styled-components';
import { color, layout, fontWeight } from 'styles/constants';

import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import Icon from 'components/Icon';
import CollectionMenu from 'menus/CollectionMenu';

import CollectionsStore from 'stores/CollectionsStore';
import UiStore from 'stores/UiStore';
import Document from 'models/Document';
import { type NavigationNode } from 'types';

type Props = {
  history: Object,
  collections: CollectionsStore,
  activeDocument: ?Document,
  onCreateCollection: Function,
  ui: UiStore,
};

const activeStyle = {
  color: color.black,
  background: color.slateDark,
};

@observer class SidebarCollections extends React.PureComponent {
  props: Props;

  render() {
    const { collections, activeDocument, ui } = this.props;

    return (
      <Flex column>
        <Header>Collections</Header>
        {collections.data.map(collection => (
          <CollectionLink
            key={collection.id}
            collection={collection}
            activeDocument={activeDocument}
            ui={ui}
          />
        ))}

        {collections.isLoaded &&
          <SidebarLink onClick={this.props.onCreateCollection}>
            <Icon type="Plus" /> Add new collection
          </SidebarLink>}
      </Flex>
    );
  }
}

@observer class CollectionLink extends React.Component {
  @observable isHovering = false;
  @observable menuOpen = false;

  handleHover = () => (this.isHovering = true);
  handleBlur = () => {
    if (!this.menuOpen) this.isHovering = false;
  };

  render() {
    const { collection, activeDocument, ui } = this.props;
    return (
      <DropToImport
        key={collection.id}
        history={history}
        collectionId={collection.id}
        activeStyle={activeStyle}
        onMouseEnter={this.handleHover}
        onMouseLeave={this.handleBlur}
      >
        <SidebarLink key={collection.id} to={collection.url}>
          <Flex justify="space-between">
            {collection.name}

            {(this.isHovering || this.menuOpen) &&
              <CollectionAction>
                <CollectionMenu
                  collection={collection}
                  onShow={() => (this.menuOpen = true)}
                  onClose={() => (this.menuOpen = false)}
                />
              </CollectionAction>}
          </Flex>
          {collection.id === ui.activeCollectionId &&
            collection.documents.map(document => (
              <DocumentLink
                key={document.id}
                document={document}
                activeDocument={activeDocument}
                depth={0}
              />
            ))}
        </SidebarLink>
      </DropToImport>
    );
  }
}

type DocumentLinkProps = {
  document: NavigationNode,
  activeDocument: ?Document,
  depth: number,
};

const DocumentLink = observer((props: DocumentLinkProps) => {
  const { document, activeDocument, depth } = props;
  const canDropToImport = depth === 0;

  return (
    <Flex column key={document.id}>
      {canDropToImport &&
        <DropToImport
          history={history}
          documentId={document.id}
          activeStyle={activeStyle}
        >
          <SidebarLink to={document.url}>{document.title}</SidebarLink>
        </DropToImport>}
      {!canDropToImport &&
        <SidebarLink to={document.url}>{document.title}</SidebarLink>}

      {activeDocument &&
        (activeDocument.pathToDocument
          .map(entry => entry.id)
          .includes(document.id) ||
          activeDocument.id === document.id) &&
        <Children column>
          {document.children &&
            document.children.map(childDocument => (
              <DocumentLink
                key={childDocument.id}
                document={childDocument}
                depth={depth + 1}
              />
            ))}
        </Children>}
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

const CollectionAction = styled.a`
  color: ${color.slate};
  svg { opacity: .75; }

  &:hover {
    svg { opacity: 1; }
  }
`;

const Children = styled(Flex)`
  margin-left: 20px;
`;

export default inject('collections', 'ui')(SidebarCollections);
