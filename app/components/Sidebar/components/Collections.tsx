import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { createCollection } from "~/actions/definitions/collections";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import CollectionLink from "./CollectionLink";
import DropCursor from "./DropCursor";
import PlaceholderCollections from "./PlaceholderCollections";
import SidebarAction from "./SidebarAction";
import SidebarLink, { DragObject } from "./SidebarLink";

function Collections() {
  const [isFetching, setFetching] = React.useState(false);
  const [fetchError, setFetchError] = React.useState();
  const { policies, documents, collections } = useStores();
  const { showToast } = useToasts();
  const [expanded, setExpanded] = React.useState(true);
  const isPreloaded = !!collections.orderedData.length;
  const { t } = useTranslation();
  const orderedCollections = collections.orderedData;

  React.useEffect(() => {
    async function load() {
      if (!collections.isLoaded && !isFetching && !fetchError) {
        try {
          setFetching(true);
          await collections.fetchPage({
            limit: 100,
          });
        } catch (error) {
          showToast(
            t("Collections could not be loaded, please reload the app"),
            {
              type: "error",
            }
          );
          setFetchError(error);
        } finally {
          setFetching(false);
        }
      }
    }

    load();
  }, [collections, isFetching, showToast, fetchError, t]);

  const [{ isCollectionDropping }, dropToReorderCollection] = useDrop({
    accept: "collection",
    drop: async (item: DragObject) => {
      collections.move(
        item.id,
        fractionalIndex(null, orderedCollections[0].index)
      );
    },
    canDrop: (item) => {
      return item.id !== orderedCollections[0].id;
    },
    collect: (monitor) => ({
      isCollectionDropping: monitor.isOver(),
    }),
  });

  const content = (
    <>
      <DropCursor
        isActiveDrop={isCollectionDropping}
        innerRef={dropToReorderCollection}
        position="top"
      />
      {orderedCollections.map((collection: Collection, index: number) => (
        <CollectionLink
          key={collection.id}
          collection={collection}
          activeDocument={documents.active}
          prefetchDocument={documents.prefetchDocument}
          canUpdate={policies.abilities(collection.id).update}
          belowCollection={orderedCollections[index + 1]}
        />
      ))}
      <SidebarAction action={createCollection} depth={0.5} />
    </>
  );

  if (!collections.isLoaded || fetchError) {
    return (
      <Flex column>
        <SidebarLink
          label={t("Collections")}
          icon={<Disclosure expanded={expanded} color="currentColor" />}
        />
        <PlaceholderCollections />
      </Flex>
    );
  }

  return (
    <Flex column>
      <SidebarLink
        onClick={() => setExpanded((prev) => !prev)}
        label={t("Collections")}
        icon={<Disclosure expanded={expanded} color="currentColor" />}
      />
      {expanded && (
        <Relative>{isPreloaded ? content : <Fade>{content}</Fade>}</Relative>
      )}
    </Flex>
  );
}

const Relative = styled.div`
  position: relative;
`;

const Disclosure = styled(CollapsedIcon)<{ expanded?: boolean }>`
  transition: transform 100ms ease, fill 50ms !important;
  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
`;

export default observer(Collections);
