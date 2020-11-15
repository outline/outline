// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import { Redirect } from "react-router-dom";

import CollectionsStore from "stores/CollectionsStore";
import Document from "models/Document";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  label?: React.Node,
  document: Document,
  collections: CollectionsStore,
  t: TFunction,
};

@observer
class NewChildDocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = () => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId);
  };

  handleNewChild = () => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId, {
      parentDocumentId: document.id,
    });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { label, document, collections, t } = this.props;
    const collection = collections.get(document.collectionId);

    return (
      <DropdownMenu label={label}>
        <DropdownMenuItems
          items={[
            {
              title: (
                <span>
                  {t("New document in")}{" "}
                  <strong>
                    {collection ? collection.name : t("collection")}
                  </strong>
                </span>
              ),
              onClick: this.handleNewDocument,
            },
            {
              title: t("New nested document"),
              onClick: this.handleNewChild,
            },
          ]}
        />
      </DropdownMenu>
    );
  }
}

export default withTranslation()<NewChildDocumentMenu>(
  inject("collections")(NewChildDocumentMenu)
);
