import { noop } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import DocumentsLoader from "~/components/DocumentsLoader";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Text from "~/components/Text";
import { useComputed } from "~/hooks/useComputed";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import useCollectionDocuments from "../hooks/useCollectionDocuments";
import { useDropToChangeCollection } from "../hooks/useDragAndDrop";
import SidebarExpansionContext, {
  useSidebarExpansionState,
} from "./SidebarExpansionContext";
import { DocumentTree } from "./DocumentTree";
import DropCursor from "./DropCursor";
import Folder from "./Folder";
import PlaceholderCollections from "./PlaceholderCollections";
import { useSidebarDisclosure } from "./SidebarDisclosureContext";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The collection to render the children of. */
  collection: Collection;
  /** Whether the children are shown in an expanded state. */
  expanded: boolean;
  /** Indentation depth of the parent collection. */
  depth?: number;
  /** Indentation depth of the child documents, defaults to below the collection. */
  childDepth?: number;
  /** Function to prefetch a document by ID. */
  prefetchDocument?: (documentId: string) => Promise<Document | void>;
  /** Element to display above the child documents */
  children?: React.ReactNode;
};

function CollectionLinkChildren({
  collection,
  expanded,
  depth = 0,
  childDepth: childDepthProp,
  prefetchDocument,
  children,
}: Props) {
  // Documents sit one level below the collection, with a minimum that leaves
  // room for their own disclosure to the left of the label.
  const childDepth = childDepthProp ?? Math.max(depth + 1, 2);
  const { documents } = useStores();
  const { t } = useTranslation();
  // Scoped to this collection so that other collections do not re-render when
  // the active document changes.
  const activeDocument = useComputed(() => {
    const active = documents.active;
    return active?.collectionId === collection.id ? active : undefined;
  }, [documents, collection]);
  const childDocuments = useCollectionDocuments(collection, activeDocument);

  const expansion = useSidebarExpansionState(childDocuments);

  // Handle collection-level alt-click cascade from DraggableCollectionLink
  const handleCascadeExpand = useCallback(() => {
    if (childDocuments) {
      expansion.expandAll(childDocuments);
    }
  }, [expansion, childDocuments]);

  const handleCascadeCollapse = useCallback(() => {
    expansion.collapseAll();
  }, [expansion]);

  useSidebarDisclosure(handleCascadeExpand, handleCascadeCollapse);

  return (
    <SidebarExpansionContext.Provider value={expansion}>
      <Folder expanded={expanded}>
        <DynamicDropCursor collection={collection} />
        <DocumentsLoader collection={collection} enabled={expanded}>
          {children}
          {!childDocuments && (
            <ResizingHeightContainer hideOverflow>
              <Loading />
            </ResizingHeightContainer>
          )}
          {childDocuments && (
            <DocumentTree
              nodes={childDocuments}
              depth={childDepth}
              collection={collection}
              prefetchDocument={prefetchDocument}
            />
          )}
          {childDocuments?.length === 0 &&
            !children &&
            !collection.isPersonal && (
              <SidebarLink
                label={
                  <Text type="tertiary" size="small" italic>
                    {t("Empty")}
                  </Text>
                }
                onClick={() => history.push(collection.url)}
                depth={childDepth}
              />
            )}
        </DocumentsLoader>
      </Folder>
    </SidebarExpansionContext.Provider>
  );
}

const DynamicDropCursor = observer(
  ({ collection }: { collection: Collection }) => {
    const [{ isOver, canDrop }] = useDropToChangeCollection(collection, noop);

    if (!canDrop || !collection.isManualSort) {
      return null;
    }

    return <DropCursor isActiveDrop={isOver} position="top" />;
  }
);

const Loading = styled(PlaceholderCollections)`
  margin-inline-start: 44px;
  min-height: 90px;
`;

export default observer(CollectionLinkChildren);
