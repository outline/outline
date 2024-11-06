import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import { toast } from "sonner";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import ConfirmMoveDialog from "~/components/ConfirmMoveDialog";
import DocumentsLoader from "~/components/DocumentsLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import useCollectionDocuments from "../hooks/useCollectionDocuments";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import PlaceholderCollections from "./PlaceholderCollections";
import SidebarLink, { DragObject } from "./SidebarLink";

type Props = {
  /** The collection to render the children of. */
  collection: Collection;
  /** Whether the children are shown in an expanded state. */
  expanded: boolean;
  /** Function to prefetch a document by ID. */
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
};

function CollectionLinkChildren({
  collection,
  expanded,
  prefetchDocument,
}: Props) {
  const pageSize = 250;
  const can = usePolicy(collection);
  const manualSort = collection.sort.field === "index";
  const { documents, dialogs, collections } = useStores();
  const { t } = useTranslation();
  const childDocuments = useCollectionDocuments(collection, documents.active);
  const [showing, setShowing] = React.useState(pageSize);

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

      const prevCollection = collections.get(item.collectionId);

      if (
        prevCollection &&
        prevCollection.permission !== collection.permission
      ) {
        dialogs.openModal({
          title: t("Change permissions?"),
          content: (
            <ConfirmMoveDialog item={item} collection={collection} index={0} />
          ),
        });
      } else {
        void documents.move({
          documentId: item.id,
          collectionId: collection.id,
          index: 0,
        });
      }
    },
    collect: (monitor) => ({
      isOverReorder: !!monitor.isOver(),
      isDraggingAnyDocument: !!monitor.canDrop(),
    }),
  });

  React.useEffect(() => {
    if (!expanded) {
      setShowing(pageSize);
    }
  }, [expanded]);

  const showMore = React.useCallback(() => {
    if (childDocuments && childDocuments.length > showing) {
      setShowing((value) => value + pageSize);
    }
  }, [childDocuments, showing]);

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
        {childDocuments?.slice(0, showing).map((node, index) => (
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
        {childDocuments?.length === 0 && (
          <SidebarLink
            label={
              <Text type="tertiary" size="small" italic>
                {t("Empty")}
              </Text>
            }
            onClick={() => history.push(collection.url)}
            depth={2}
          />
        )}
        <Waypoint key={showing} onEnter={showMore} fireOnRapidScroll />
      </DocumentsLoader>
    </Folder>
  );
}

const Loading = styled(PlaceholderCollections)`
  margin-left: 44px;
  min-height: 90px;
`;

export default observer(CollectionLinkChildren);
