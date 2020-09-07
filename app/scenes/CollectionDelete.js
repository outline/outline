// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import CollectionsStore from "stores/CollectionsStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import { homeUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  collection: Collection,
  collections: CollectionsStore,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class CollectionDelete extends React.Component<Props> {
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isDeleting = true;

    try {
      await this.props.collection.delete();
      this.props.history.push(homeUrl());
      this.props.onSubmit();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isDeleting = false;
    }
  };

  render() {
    const { collection } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure about that? Deleting the{" "}
            <strong>{collection.name}</strong> collection is permanent and
            cannot be restored, however documents within will be moved to the
            trash.
          </HelpText>
          <Button type="submit" disabled={this.isDeleting} autoFocus danger>
            {this.isDeleting ? "Deleting…" : "I’m sure – Delete"}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject("collections", "ui")(withRouter(CollectionDelete));
