// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import DropToImport from "components/DropToImport";
import Flex from "components/Flex";
import DocumentLink from "./DocumentLink";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import CollectionMenu from "menus/CollectionMenu";

type Props = {|
  collection: Collection,
  ui: UiStore,
  canUpdate: boolean,
  documents: DocumentsStore,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => Promise<void>,
|};

@observer
class CollectionLink extends React.Component<Props> {
  @observable menuOpen = false;

  handleTitleChange = async (name: string) => {
    await this.props.collection.save({ name });
  };

  render() {
    const {
      collection,
      documents,
      activeDocument,
      prefetchDocument,
      canUpdate,
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
          label={
            <EditableTitle
              title={collection.name}
              onSubmit={this.handleTitleChange}
              canUpdate={canUpdate}
            />
          }
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
            {collection.documents.map((node) => (
              <DocumentLink
                key={node.id}
                node={node}
                documents={documents}
                collection={collection}
                activeDocument={activeDocument}
                prefetchDocument={prefetchDocument}
                canUpdate={canUpdate}
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
