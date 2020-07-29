// @flow
import * as React from "react";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Document from "models/Document";
import UiStore from "stores/UiStore";

type Props = {
  ui: UiStore,
  document: Document,
  onSubmit: () => void,
};

@observer
class DocumentTemplatize extends React.Component<Props> {
  @observable isSaving: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.isSaving = true;

    try {
      await this.props.document.templatize();
      this.props.ui.showToast("Document converted to template!");
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
            Are you sure? Converting <strong>{document.title}</strong> to a
            template will remove the document from the collection navigation –
            it will become available as a template for new documents.
          </HelpText>
          <Button type="submit">
            {this.isSaving ? "Saving…" : "Convert document"}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject("ui")(DocumentTemplatize);
