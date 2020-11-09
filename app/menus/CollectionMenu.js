// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withRouter, type RouterHistory } from "react-router-dom";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import CollectionDelete from "scenes/CollectionDelete";
import CollectionEdit from "scenes/CollectionEdit";
import CollectionExport from "scenes/CollectionExport";
import CollectionMembers from "scenes/CollectionMembers";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";
import Modal from "components/Modal";
import VisuallyHidden from "components/VisuallyHidden";
import getDataTransferFiles from "utils/getDataTransferFiles";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  position?: "left" | "right" | "center",
  ui: UiStore,
  policies: PoliciesStore,
  documents: DocumentsStore,
  collection: Collection,
  history: RouterHistory,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class CollectionMenu extends React.Component<Props> {
  file: ?HTMLInputElement;
  @observable showCollectionMembers = false;
  @observable showCollectionEdit = false;
  @observable showCollectionDelete = false;
  @observable showCollectionExport = false;

  onNewDocument = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.history.push(newDocumentUrl(collection.id));
  };

  onImportDocument = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    ev.stopPropagation();

    // simulate a click on the file upload input element
    if (this.file) this.file.click();
  };

  onFilePicked = async (ev: SyntheticEvent<>) => {
    const files = getDataTransferFiles(ev);

    try {
      const file = files[0];
      const document = await this.props.documents.import(
        file,
        null,
        this.props.collection.id,
        { publish: true }
      );
      this.props.history.push(document.url);
    } catch (err) {
      this.props.ui.showToast(err.message);
    }
  };

  handleEditCollectionOpen = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.showCollectionEdit = true;
  };

  handleEditCollectionClose = () => {
    this.showCollectionEdit = false;
  };

  handleDeleteCollectionOpen = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.showCollectionDelete = true;
  };

  handleDeleteCollectionClose = () => {
    this.showCollectionDelete = false;
  };

  handleExportCollectionOpen = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.showCollectionExport = true;
  };

  handleExportCollectionClose = () => {
    this.showCollectionExport = false;
  };

  handleMembersModalOpen = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.showCollectionMembers = true;
  };

  handleMembersModalClose = () => {
    this.showCollectionMembers = false;
  };

  render() {
    const {
      policies,
      documents,
      collection,
      position,
      onOpen,
      onClose,
    } = this.props;
    const can = policies.abilities(collection.id);

    return (
      <>
        <VisuallyHidden>
          <input
            type="file"
            ref={(ref) => (this.file = ref)}
            onChange={this.onFilePicked}
            onClick={(ev) => ev.stopPropagation()}
            accept={documents.importFileTypes.join(", ")}
          />
        </VisuallyHidden>

        <Modal
          title="Collection permissions"
          onRequestClose={this.handleMembersModalClose}
          isOpen={this.showCollectionMembers}
        >
          <CollectionMembers
            collection={collection}
            onSubmit={this.handleMembersModalClose}
            handleEditCollectionOpen={this.handleEditCollectionOpen}
            onEdit={this.handleEditCollectionOpen}
          />
        </Modal>
        <DropdownMenu onOpen={onOpen} onClose={onClose} position={position}>
          {collection && (
            <>
              {can.update && (
                <DropdownMenuItem onClick={this.onNewDocument}>
                  New document
                </DropdownMenuItem>
              )}
              {can.update && (
                <DropdownMenuItem onClick={this.onImportDocument}>
                  Import document
                </DropdownMenuItem>
              )}
              {can.update && <hr />}
              {can.update && (
                <DropdownMenuItem onClick={this.handleEditCollectionOpen}>
                  Edit…
                </DropdownMenuItem>
              )}
              {can.update && (
                <DropdownMenuItem onClick={this.handleMembersModalOpen}>
                  Permissions…
                </DropdownMenuItem>
              )}
              {can.export && (
                <DropdownMenuItem onClick={this.handleExportCollectionOpen}>
                  Export…
                </DropdownMenuItem>
              )}
            </>
          )}
          {can.delete && (
            <DropdownMenuItem onClick={this.handleDeleteCollectionOpen}>
              Delete…
            </DropdownMenuItem>
          )}
        </DropdownMenu>
        <Modal
          title="Edit collection"
          isOpen={this.showCollectionEdit}
          onRequestClose={this.handleEditCollectionClose}
        >
          <CollectionEdit
            onSubmit={this.handleEditCollectionClose}
            collection={collection}
          />
        </Modal>
        <Modal
          title="Delete collection"
          isOpen={this.showCollectionDelete}
          onRequestClose={this.handleDeleteCollectionClose}
        >
          <CollectionDelete
            onSubmit={this.handleDeleteCollectionClose}
            collection={collection}
          />
        </Modal>
        <Modal
          title="Export collection"
          isOpen={this.showCollectionExport}
          onRequestClose={this.handleExportCollectionClose}
        >
          <CollectionExport
            onSubmit={this.handleExportCollectionClose}
            collection={collection}
          />
        </Modal>
      </>
    );
  }
}

export default inject(
  "ui",
  "documents",
  "policies"
)(withRouter(CollectionMenu));
