// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import { CollectionIcon, PrivateCollectionIcon } from 'outline-icons';
import styled from 'styled-components';
import Collection from 'models/Collection';
import Document from 'models/Document';
import CollectionMenu from 'menus/CollectionMenu';
import UiStore from 'stores/UiStore';
import SidebarLink from './SidebarLink';
import DocumentLink from './DocumentLink';
import DropToImport from 'components/DropToImport';
import Flex from 'shared/components/Flex';

type Props = {
  history: Object,
  collection: Collection,
  ui: UiStore,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => *,
};

@observer
class CollectionLink extends React.Component<Props> {
  @observable menuOpen = false;

  render() {
    const {
      history,
      collection,
      activeDocument,
      prefetchDocument,
      ui,
    } = this.props;
    const expanded = collection.id === ui.activeCollectionId;

    return (
      <DropToImport
        key={collection.id}
        history={history}
        collectionId={collection.id}
        activeClassName="activeDropZone"
      >
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={
            collection.private ? (
              <PrivateCollectionIcon
                expanded={expanded}
                color={collection.color}
              />
            ) : (
              <CollectionIcon expanded={expanded} color={collection.color} />
            )
          }
          iconColor={collection.color}
          expand={expanded}
          hideExpandToggle
          menuOpen={this.menuOpen}
          expandedContent={
            <CollectionChildren column>
              {collection.documents.map(document => (
                <DocumentLink
                  key={document.id}
                  history={history}
                  document={document}
                  activeDocument={activeDocument}
                  prefetchDocument={prefetchDocument}
                  depth={0}
                />
              ))}
            </CollectionChildren>
          }
          menu={
            <CollectionMenu
              history={history}
              collection={collection}
              onOpen={() => (this.menuOpen = true)}
              onClose={() => (this.menuOpen = false)}
            />
          }
        >
          <CollectionName justify="space-between">
            {collection.name}
          </CollectionName>
        </SidebarLink>
      </DropToImport>
    );
  }
}

const CollectionName = styled(Flex)`
  padding: 0 0 4px;
`;

const CollectionChildren = styled(Flex)`
  margin-top: -4px;
  margin-left: 36px;
  padding-bottom: 4px;
`;

export default CollectionLink;
