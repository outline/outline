// @flow
import { observer } from "mobx-react";
import * as React from "react";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import DropToImport from "components/DropToImport";
import DocumentLink from "./DocumentLink";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import CollectionMenu from "menus/CollectionMenu";

type Props = {|
  collection: Collection,
  ui: UiStore,
  canUpdate: boolean,
  activeDocument: ?Document,
  prefetchDocument: (id: string) => Promise<void>,
|};

function CollectionLink({
  collection,
  activeDocument,
  prefetchDocument,
  canUpdate,
  ui,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleTitleChange = React.useCallback(
    async (name: string) => {
      await collection.save({ name });
    },
    [collection]
  );

  const expanded = collection.id === ui.activeCollectionId;

  return (
    <>
      <DropToImport key={collection.id} collectionId={collection.id}>
        <SidebarLink
          key={collection.id}
          to={collection.url}
          icon={<CollectionIcon collection={collection} expanded={expanded} />}
          iconColor={collection.color}
          expanded={expanded}
          menuOpen={menuOpen}
          label={
            <EditableTitle
              title={collection.name}
              onSubmit={handleTitleChange}
              canUpdate={canUpdate}
            />
          }
          exact={false}
          menu={
            <CollectionMenu
              position="right"
              collection={collection}
              onOpen={() => setMenuOpen(true)}
              onClose={() => setMenuOpen(false)}
            />
          }
        ></SidebarLink>
      </DropToImport>

      {expanded &&
        collection.documents.map((node) => (
          <DocumentLink
            key={node.id}
            node={node}
            collection={collection}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            canUpdate={canUpdate}
            depth={1.5}
          />
        ))}
    </>
  );
}

export default observer(CollectionLink);
