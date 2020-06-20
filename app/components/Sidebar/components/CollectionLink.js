// @flow
import * as React from "react";
import { observer } from "mobx-react";
import { observable } from "mobx";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionMenu from "menus/CollectionMenu";
import UiStore from "stores/UiStore";
import DocumentsStore from "stores/DocumentsStore";
import SidebarLink from "./SidebarLink";
import DocumentLink from "./DocumentLink";
import CollectionIcon from "components/CollectionIcon";
import DropToImport from "components/DropToImport";
import Flex from "shared/components/Flex";

type Props = {
  collection: Collection,
  ui: UiStore,
  documents: DocumentsStore,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => Promise<void>,
};

@observer
class CollectionLink extends React.Component<Props> {
  @observable menuOpen = false;

  render() {
    const {
      collection,
      documents,
      activeDocument,
      prefetchDocument,
      ui,
    } = this.props;
    const expanded = collection.id === ui.activeCollectionId;

    return (
      <DropToImport
        key={collection.id}
        collectionId={collection.id}
        activeClassName="activeDropZone"
      >
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={<CollectionIcon collection={collection} expanded={expanded} />}
          iconColor={collection.color}
          expanded={expanded}
          hideDisclosure
          menuOpen={this.menuOpen}
          label={collection.name}
          exact={false}
          menu={
            <CollectionMenu
              position="right"
              collection={collection}
              onOpen={() => (this.menuOpen = true)}
              onClose={() => (this.menuOpen = false)}
            />
          }
        >
          <Flex column>
            {collection.documents.map(node => (
              <DocumentLink
                key={node.id}
                node={node}
                documents={documents}
                collection={collection}
                activeDocument={activeDocument}
                prefetchDocument={prefetchDocument}
                depth={1.5}
              />
            ))}
          </Flex>
        </SidebarLink>
      </DropToImport>
    );
  }
}

export default CollectionLink;
