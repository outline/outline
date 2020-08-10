// @flow
import { observer, inject } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import keydown from "react-keydown";
import { withRouter, type RouterHistory } from "react-router-dom";

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
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  policies: PoliciesStore,
  collections: CollectionsStore,
  documents: DocumentsStore,
  onCreateCollection: () => void,
  ui: UiStore,
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

  @keydown("n")
  goToNewDocument() {
    if (this.props.ui.editMode) return;

    const { activeCollectionId } = this.props.ui;
    if (!activeCollectionId) return;

    const can = this.props.policies.abilities(activeCollectionId);
    if (!can.update) return;

    this.props.history.push(newDocumentUrl(activeCollectionId));
  }

  render() {
    const { collections, ui, documents } = this.props;

    const content = (
      <>
        {collections.orderedData.map((collection) => (
          <CollectionLink
            key={collection.id}
            documents={documents}
            collection={collection}
            activeDocument={documents.active}
            prefetchDocument={documents.prefetchDocument}
            ui={ui}
          />
        ))}
        <SidebarLink
          to="/collections"
          onClick={this.props.onCreateCollection}
          icon={<PlusIcon color="currentColor" />}
          label="New collection…"
          exact
        />
      </>
    );

    return (
      <Flex column>
        <Header>Collections</Header>
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

export default inject(
  "collections",
  "ui",
  "documents",
  "policies"
)(withRouter(Collections));
