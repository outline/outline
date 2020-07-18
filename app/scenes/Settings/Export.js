// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import AuthStore from "stores/AuthStore";
import CollectionsStore from "stores/CollectionsStore";
import UiStore from "stores/UiStore";

import CenteredContent from "components/CenteredContent";
import PageTitle from "components/PageTitle";
import HelpText from "components/HelpText";
import Button from "components/Button";

type Props = {
  auth: AuthStore,
  collections: CollectionsStore,
  ui: UiStore,
};

@observer
class Export extends React.Component<Props> {
  @observable isLoading: boolean = false;
  @observable isExporting: boolean = false;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isLoading = true;

    try {
      await this.props.collections.export();
      this.isExporting = true;
      this.props.ui.showToast("Export in progress…");
    } finally {
      this.isLoading = false;
    }
  };

  render() {
    const { auth } = this.props;
    if (!auth.user) return null;

    return (
      <CenteredContent>
        <PageTitle title="Export Data" />
        <h1>Export Data</h1>
        <HelpText>
          Exporting your team’s documents may take a little time depending on
          the size of your knowledge base. Consider exporting a single document
          or collection instead.
        </HelpText>
        <HelpText>
          Still want to export everything in your wiki? We’ll put together a zip
          file of your collections and documents in Markdown format and email it
          to <strong>{auth.user.email}</strong>.
        </HelpText>
        <Button
          type="submit"
          onClick={this.handleSubmit}
          disabled={this.isLoading || this.isExporting}
          primary
        >
          {this.isExporting
            ? "Export Requested"
            : this.isLoading ? "Requesting Export…" : "Export All Data"}
        </Button>
      </CenteredContent>
    );
  }
}

export default inject("auth", "ui", "collections")(Export);
