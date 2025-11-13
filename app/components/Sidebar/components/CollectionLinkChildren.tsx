import noop from "lodash/noop";
import { observer } from "mobx-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Waypoint } from "react-waypoint";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import DocumentsLoader from "~/components/DocumentsLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import useCollectionDocuments from "../hooks/useCollectionDocuments";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import DocumentLink from "./DocumentLink";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import PlaceholderCollections from "./PlaceholderCollections";
import SidebarLink from "./SidebarLink";

// The number of child documents to initially render
const DEFAULT_PAGE_SIZE = 50;

type Props = {
  /** The collection to render the children of. */
  collection: Collection;
  /** Whether the children are shown in an expanded state. */
  expanded: boolean;
  /** Function to prefetch a document by ID. */
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  /** Element to display above the child documents */
  children?: React.ReactNode;
};

function CollectionLinkChildren({
  collection,
  expanded,
  prefetchDocument,
  children,
}: Props) {
  const pageSize = DEFAULT_PAGE_SIZE;
  const { documents } = useStores();
  const { t } = useTranslation();
  const childDocuments = useCollectionDocuments(collection, documents.active);
  const [showing, setShowing] = useState(pageSize);

  useEffect(() => {
    if (!expanded) {
      setShowing(pageSize);
    }
  }, [expanded]);

  const showMore = useCallback(() => {
    if (childDocuments && childDocuments.length > showing) {
      setShowing((value) => value + pageSize);
    }
  }, [childDocuments, showing]);

  return (
    <Folder expanded={expanded}>
      <DynamicDropCursor collection={collection} />
      <DocumentsLoader collection={collection} enabled={expanded}>
        {children}
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
        {childDocuments?.length === 0 && !children && (
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
        {childDocuments && (
          <Waypoint key={showing} onEnter={showMore} fireOnRapidScroll />
        )}
      </DocumentsLoader>
    </Folder>
  );
}

const DynamicDropCursor = observer(
  ({ collection }: { collection: Collection }) => {
    const dummyRef = useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop }] = useDropToChangeCollection(
      collection,
      noop,
      dummyRef
    );

    if (!canDrop || !collection.isManualSort) {
      return null;
    }

    return (
      <DropCursor isActiveDrop={isOver} innerRef={dummyRef} position="top" />
    );
  }
);

const Loading = styled(PlaceholderCollections)`
  margin-left: 44px;
  min-height: 90px;
`;

export default observer(CollectionLinkChildren);
