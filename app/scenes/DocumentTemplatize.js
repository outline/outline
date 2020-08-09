// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import { documentUrl } from "utils/routeHelpers";

type Props = {
  ui: UiStore,
  document: Document,
  history: RouterHistory,
  onSubmit: () => void,
};

@observer
class DocumentTemplatize extends React.Component<Props> {
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      const template = await this.props.document.templatize();
      this.props.history.push(documentUrl(template));
      this.props.ui.showToast("Template created, go ahead and customize it");
      this.props.onSubmit();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  render() {
    const { document } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Creating a template from{" "}
            <strong>{document.titleWithDefault}</strong> is a non-destructive
            action – we'll make a copy of the document and turn it into a
            template that can be used as a starting point for new documents.
          </HelpText>
          <Button type="submit">
            {this.isSaving ? "Creating…" : "Create template"}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject("ui")(withRouter(DocumentTemplatize));
