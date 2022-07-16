import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "~/models/Collection";
import Flex from "~/components/Flex";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import { createCollection } from "~/actions/definitions/collections";
import useStores from "~/hooks/useStores";
import DraggableCollectionLink from "./DraggableCollectionLink";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarAction from "./SidebarAction";
import { DragObject } from "./SidebarLink";

function Collections() {
  const { documents, collections } = useStores();
  const { t } = useTranslation();
  const orderedCollections = collections.orderedData;

  const [
    { isCollectionDropping, isDraggingAnyCollection },
    dropToReorderCollection,
  ] = useDrop({
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
      isDraggingAnyCollection: monitor.getItemType() === "collection",
    }),
  });

  return (
    <Flex column>
      <Header id="collections" title={t("Collections")}>
        <Relative>
          <PaginatedList
            aria-label={t("Collections")}
            items={collections.orderedData}
            fetch={collections.fetchPage}
            options={{ limit: 100 }}
            loading={<PlaceholderCollections />}
            heading={
              isDraggingAnyCollection ? (
                <DropCursor
                  isActiveDrop={isCollectionDropping}
                  innerRef={dropToReorderCollection}
                  position="top"
                />
              ) : undefined
            }
            empty={
              <Empty type="tertiary" size="small">
                {t("Empty")}
              </Empty>
            }
            renderError={(props) => <StyledError {...props} />}
            renderItem={(item: Collection, index) => (
              <DraggableCollectionLink
                key={item.id}
                collection={item}
                activeDocument={documents.active}
                prefetchDocument={documents.prefetchDocument}
                belowCollection={orderedCollections[index + 1]}
              />
            )}
          >
            <SidebarAction action={createCollection} depth={0} />
          </PaginatedList>
        </Relative>
      </Header>
    </Flex>
  );
}

const Empty = styled(Text)`
  margin-left: 36px;
  margin-bottom: 0;
  line-height: 34px;
  font-style: italic;
`;

const StyledError = styled(Error)`
  font-size: 15px;
  padding: 0 8px;
`;

export default observer(Collections);
