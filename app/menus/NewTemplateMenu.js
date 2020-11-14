// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { withTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";

import CollectionsStore from "stores/CollectionsStore";
import PoliciesStore from "stores/PoliciesStore";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import {
  DropdownMenu,
  DropdownMenuItem,
  Header,
} from "components/DropdownMenu";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  label?: React.Node,
  collections: CollectionsStore,
  policies: PoliciesStore,
};

@withTranslation()
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

    const { collections, policies, label, t, ...rest } = this.props;

    return (
      <DropdownMenu
        label={
          label || (
            <Button icon={<PlusIcon />} small>
              {t("New template…")}
            </Button>
          )
        }
        {...rest}
      >
        <Header>{t("Choose a collection")}</Header>
        {collections.orderedData.map((collection) => {
          const can = policies.abilities(collection.id);

          return (
            <DropdownMenuItem
              key={collection.id}
              onClick={() => this.handleNewDocument(collection.id)}
              disabled={!can.update}
            >
              <CollectionIcon collection={collection} />
              &nbsp;{collection.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenu>
    );
  }
}

export default inject("collections", "policies")(NewTemplateMenu);
