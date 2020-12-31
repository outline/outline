// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Document from "models/Document";
import CollectionIcon from "components/CollectionIcon";
import DropToImport from "components/DropToImport";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import EditableTitle from "./EditableTitle";
import SidebarLink from "./SidebarLink";
import useStores from "hooks/useStores";
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

  const { documents, policies } = useStores();
  const expanded = collection.id === ui.activeCollectionId;
  const manualSort = collection.sort.field === "index";

  // Drop to re-parent
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "document",
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      if (!collection) return;
      documents.move(item.id, collection.id);
    },
    canDrop: (item, monitor) => {
      return policies.abilities(collection.id).update;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Drop to reorder
  const [{ isOverReorder }, dropToReorder] = useDrop({
    accept: "document",
    drop: async (item, monitor) => {
      if (!collection) return;
      documents.move(item.id, collection.id, undefined, 0);
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
    }),
  });

  return (
    <>
      <div ref={drop} style={{ position: "relative" }}>
        <DropToImport key={collection.id} collectionId={collection.id}>
          <SidebarLink
            key={collection.id}
            to={collection.url}
            icon={
              <CollectionIcon collection={collection} expanded={expanded} />
            }
            iconColor={collection.color}
            expanded={expanded}
            menuOpen={menuOpen}
            isActiveDrop={isOver && canDrop}
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
        {expanded && manualSort && (
          <DropCursor isActiveDrop={isOverReorder} innerRef={dropToReorder} />
        )}
      </div>

      {expanded &&
        collection.documents.map((node, index) => (
          <DocumentLink
            key={node.id}
            node={node}
            collection={collection}
            activeDocument={activeDocument}
            prefetchDocument={prefetchDocument}
            canUpdate={canUpdate}
            depth={1.5}
            index={index}
          />
        ))}
    </>
  );
}

export default observer(CollectionLink);
