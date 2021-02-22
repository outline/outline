// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import Fade from "components/Fade";
import Flex from "components/Flex";
import CollectionLink from "./CollectionLink";
import CollectionsLoading from "./CollectionsLoading";
import Header from "./Header";
import SidebarLink from "./SidebarLink";
import useStores from "hooks/useStores";
import { newDocumentUrl } from "utils/routeHelpers";
type Props = {
  onCreateCollection: () => void,
};

const Collections = ({ onCreateCollection }: Props) => {
  const { collections, ui, policies, documents } = useStores();
  const { t } = useTranslation();
  const isPreloaded: boolean = !!collections.orderedData.length;
  const history = useHistory();

  React.useEffect(() => {
    if (!collections.isFetching && !collections.isLoaded) {
      collections.fetchPage({ limit: 100 });
    }
  }, [collections]);

  useHotkeys("n", () => {
    const { activeCollectionId } = ui;
    if (!activeCollectionId) return;

    const can = policies.abilities(activeCollectionId);
    if (!can.update) return;

    history.push(newDocumentUrl(activeCollectionId));
  });

  const content = (
    <>
      {collections.orderedData.map((collection) => (
        <CollectionLink
          key={collection.id}
          collection={collection}
          activeDocument={documents.active}
          prefetchDocument={documents.prefetchDocument}
          canUpdate={policies.abilities(collection.id).update}
          ui={ui}
        />
      ))}
      <SidebarLink
        to="/collections"
        onClick={onCreateCollection}
        icon={<PlusIcon color="currentColor" />}
        label={`${t("New collection")}…`}
        exact
      />
    </>
  );

  return (
    <Flex column>
      <Header>{t("Collections")}</Header>
      {collections.isLoaded ? (
        isPreloaded ? (
          content
        ) : (
          <Fade>{content}</Fade>
        )
      ) : (
        <CollectionsLoading />
      )}
    </Flex>
  );
};

export default observer(Collections);
