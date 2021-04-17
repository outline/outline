// @flow
import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import Fade from "components/Fade";
import Flex from "components/Flex";
import useStores from "../../../hooks/useStores";
import CollectionLink from "./CollectionLink";
import CollectionsLoading from "./CollectionsLoading";
import DropCursor from "./DropCursor";
import Header from "./Header";
import SidebarLink from "./SidebarLink";
import useCurrentTeam from "hooks/useCurrentTeam";
type Props = {
  onCreateCollection: () => void,
};

function Collections({ onCreateCollection }: Props) {
  const [isFetching, setFetching] = React.useState(false);
  const { ui, policies, documents, collections } = useStores();
  const isPreloaded: boolean = !!collections.orderedData.length;
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const orderedCollections = collections.orderedData;
  const can = policies.abilities(team.id);
  const [isDraggingAnyCollection, setIsDraggingAnyCollection] = React.useState(
    false
  );

  React.useEffect(() => {
    async function load() {
      if (!collections.isLoaded && !isFetching) {
        try {
          setFetching(true);
          await collections.fetchPage({ limit: 100 });
        } finally {
          setFetching(false);
        }
      }
    }
    load();
  }, [collections, isFetching]);

  const [{ isCollectionDropping }, dropToReorderCollection] = useDrop({
    accept: "collection",
    drop: async (item, monitor) => {
      collections.move(
        item.id,
        fractionalIndex(null, orderedCollections[0].index)
      );
    },
    canDrop: (item, monitor) => {
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
        from="collections"
      />
      {orderedCollections.map((collection, index) => (
        <CollectionLink
          key={collection.id}
          collection={collection}
          activeDocument={documents.active}
          prefetchDocument={documents.prefetchDocument}
          canUpdate={policies.abilities(collection.id).update}
          ui={ui}
          isDraggingAnyCollection={isDraggingAnyCollection}
          onChangeDragging={setIsDraggingAnyCollection}
          belowCollection={orderedCollections[index + 1]}
        />
      ))}
      {can.createCollection && (
        <SidebarLink
          to="/collections"
          onClick={onCreateCollection}
          icon={<PlusIcon color="currentColor" />}
          label={`${t("New collection")}…`}
          exact
        />
      )}
    </>
  );

  if (!collections.isLoaded) {
    return (
      <Flex column>
        <Header>{t("Collections")}</Header>
        <CollectionsLoading />
      </Flex>
    );
  }

  return (
    <Flex column>
      <Header>{t("Collections")}</Header>
      {isPreloaded ? content : <Fade>{content}</Fade>}
    </Flex>
  );
}

export default observer(Collections);
