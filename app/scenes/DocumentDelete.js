// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import DocumentsStore from "stores/DocumentsStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import { collectionUrl, documentUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  document: Document,
  documents: DocumentsStore,
  ui: UiStore,
  onSubmit: () => void,
};

@observer
class DocumentDelete extends React.Component<Props> {
  @observable isDeleting: boolean;

  handleSubmit = async (ev: SyntheticEvent<>) => {
    const { documents, document } = this.props;
    ev.preventDefault();
    this.isDeleting = true;

    try {
      await document.delete();

      // only redirect if we're currently viewing the document that's deleted
      if (this.props.ui.activeDocumentId === document.id) {
        // If the document has a parent and it's available in the store then
        // redirect to it
        if (document.parentDocumentId) {
          const parent = documents.get(document.parentDocumentId);
          if (parent) {
            this.props.history.push(documentUrl(parent));
            return;
          }
        }

        // otherwise, redirect to the collection home
        this.props.history.push(collectionUrl(document.collectionId));
      }
      this.props.onSubmit();
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isDeleting = false;
    }
  };

  render() {
    const { document } = this.props;

    return (
      <Flex column>
        <form onSubmit={this.handleSubmit}>
          <HelpText>
            Are you sure about that? Deleting the{" "}
            <strong>{document.titleWithDefault}</strong> {document.noun} will
            delete all of its history
            {document.isTemplate ? "" : ", and any nested documents"}.
          </HelpText>
          {!document.isDraft && !document.isArchived && (
            <HelpText>
              If you’d like the option of referencing or restoring this{" "}
              {document.noun} in the future, consider archiving it instead.
            </HelpText>
          )}
          <Button type="submit" danger>
            {this.isDeleting ? "Deleting…" : "I’m sure – Delete"}
          </Button>
        </form>
      </Flex>
    );
  }
}

export default inject("documents", "ui")(withRouter(DocumentDelete));
