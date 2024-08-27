import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentsLoader from "~/components/DocumentsLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import EmptyCollectionPlaceholder from "./EmptyCollectionPlaceholder";
import Folder from "./Folder";
import PlaceholderCollections from "./PlaceholderCollections";
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
  const manualSort = collection.sort.field === "index";
  const { documents } = useStores();
  const { t } = useTranslation();

  const childDocuments = useCollectionDocuments(collection, documents.active);

  // Drop to reorder document
  const [{ isOverReorder, isDraggingAnyDocument }, dropToReorder] = useDrop({
    accept: "document",
    drop: (item: DragObject) => {
      if (!manualSort && item.collectionId === collection?.id) {
        toast.message(
          t(
            "You can't reorder documents in an alphabetically sorted collection"
          )
        );
        return;
      }

      if (!collection) {
        return;
      }
      void documents.move({
        documentId: item.id,
        collectionId: collection.id,
        index: 0,
      });
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
      <DocumentsLoader collection={collection} enabled={expanded}>
        {!childDocuments && (
          <ResizingHeightContainer hideOverflow>
            <Loading />
          </ResizingHeightContainer>
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
      </DocumentsLoader>
    </Folder>
  );
}

const Loading = styled(PlaceholderCollections)`
  margin-left: 44px;
  min-height: 90px;
`;

export default observer(CollectionLinkChildren);
