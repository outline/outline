// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Fade from "components/Fade";
import Flex from "components/Flex";
import useStores from "../../../hooks/useStores";
import CollectionLink from "./CollectionLink";
import CollectionsLoading from "./CollectionsLoading";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

type Props = {
  onCreateCollection: () => void,
};

function Collections({ onCreateCollection }: Props) {
  const { ui, policies, documents, collections } = useStores();
  const isPreloaded: boolean = !!collections.orderedData.length;
  const { t } = useTranslation();
  React.useEffect(() => {
    if (!collections.isFetching && !collections.isLoaded) {
      collections.fetchPage({ limit: 100 });
    }
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
}

export default observer(Collections);
