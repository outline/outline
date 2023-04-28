import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import EmptyCollectionPlaceholder from "./EmptyCollectionPlaceholder";
import Folder from "./Folder";
import { DragObject } from "./SidebarLink";
import useCollectionDocuments from "./useCollectionDocuments";

type Props = {
  collection: Collection;
  expanded: boolean;
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
};

function CollectionLinkChildren({
  collection,
  expanded,
  prefetchDocument,
}: Props) {
  const can = usePolicy(collection);
  const { showToast } = useToasts();
  const manualSort = collection.sort.field === "index";
  const { documents } = useStores();
  const { t } = useTranslation();

  const childDocuments = useCollectionDocuments(collection, documents.active);

  // Drop to reorder document
  const [{ isOverReorder, isDraggingAnyDocument }, dropToReorder] = useDrop({
    accept: "document",
    drop: (item: DragObject) => {
      if (!manualSort && item.collectionId === collection?.id) {
        showToast(
          t(
            "You can't reorder documents in an alphabetically sorted collection"
          ),
          {
            type: "info",
            timeout: 5000,
          }
        );
        return;
      }

      if (!collection) {
        return;
      }
      documents.move(item.id, collection.id, undefined, 0);
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAnyDocument: !!monitor.canDrop(),
    }),
  });

  return (
    <Folder expanded={expanded}>
      {isDraggingAnyDocument && can.createDocument && manualSort && (
        <DropCursor
          isActiveDrop={isOverReorder}
          innerRef={dropToReorder}
          position="top"
        />
      )}
      {childDocuments?.map((node, index) => (
        <DocumentLink
          key={node.id}
          node={node}
          collection={collection}
          activeDocument={documents.active}
          prefetchDocument={prefetchDocument}
          isDraft={node.isDraft}
          depth={2}
          index={index}
        />
      ))}
      {childDocuments?.length === 0 && <EmptyCollectionPlaceholder />}
    </Folder>
  );
}

export default observer(CollectionLinkChildren);
