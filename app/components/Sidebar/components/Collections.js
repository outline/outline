// @flow
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import CollectionsStore from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import Fade from "components/Fade";
import Flex from "components/Flex";
import CollectionLink from "./CollectionLink";
import CollectionsLoading from "./CollectionsLoading";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

type Props = {
  policies: PoliciesStore,
  collections: CollectionsStore,
  documents: DocumentsStore,
  onCreateCollection: () => void,
  ui: UiStore,
  t: TFunction,
};

@observer
class Collections extends React.Component<Props> {
  isPreloaded: boolean = !!this.props.collections.orderedData.length;

  componentDidMount() {
    const { collections } = this.props;

    if (!collections.isFetching && !collections.isLoaded) {
      collections.fetchPage({ limit: 100 });
    }
  }

  render() {
    const { collections, ui, policies, documents, t } = this.props;

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
          onClick={this.props.onCreateCollection}
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
          this.isPreloaded ? (
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
}

export default withTranslation()<Collections>(
  inject("collections", "ui", "documents", "policies")(Collections)
);
