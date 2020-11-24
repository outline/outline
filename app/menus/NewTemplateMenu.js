// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { Redirect } from "react-router-dom";

import CollectionsStore from "stores/CollectionsStore";
import PoliciesStore from "stores/PoliciesStore";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import { DropdownMenu, Header } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  label?: React.Node,
  collections: CollectionsStore,
  policies: PoliciesStore,
};

@observer
class NewTemplateMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = (collectionId: string) => {
    this.redirectTo = newDocumentUrl(collectionId, {
      template: true,
    });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { collections, policies, label, ...rest } = this.props;

    return (
      <DropdownMenu
        label={
          label || (
            <Button icon={<PlusIcon />} small>
              New template…
            </Button>
          )
        }
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

export default inject("collections", "policies")(NewTemplateMenu);
