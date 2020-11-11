// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { Redirect } from "react-router-dom";

import CollectionsStore from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import { DropdownMenu, Header } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  label?: React.Node,
  documents: DocumentsStore,
  collections: CollectionsStore,
  policies: PoliciesStore,
};

@observer
class NewDocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = (collectionId: string, options) => {
    this.redirectTo = newDocumentUrl(collectionId, options);
  };

  onOpen = () => {
    const { collections } = this.props;

    if (collections.orderedData.length === 1) {
      this.handleNewDocument(collections.orderedData[0].id);
    }
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { collections, documents, policies, label, ...rest } = this.props;
    const singleCollection = collections.orderedData.length === 1;

    return (
      <DropdownMenu
        label={
          label || (
            <Button icon={<PlusIcon />} small>
              New doc{singleCollection ? "" : "…"}
            </Button>
          )
        }
        onOpen={this.onOpen}
        {...rest}
      >
        <Header>Choose a collection</Header>
        <DropdownMenuItems
          items={collections.orderedData.map((collection) => ({
            onClick: () => this.handleNewDocument(collection.id),
            disabled: !policies.abilities(collection.id).update,
            title: (
              <>
                <CollectionIcon collection={collection} />
                &nbsp;{collection.name}
              </>
            ),
          }))}
        />
      </DropdownMenu>
    );
  }
}

export default inject("collections", "documents", "policies")(NewDocumentMenu);
