// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter, type RouterHistory } from 'react-router-dom';
import Modal from 'components/Modal';
import VisuallyHidden from 'components/VisuallyHidden';
import CollectionMembers from 'scenes/CollectionMembers';

import { newDocumentUrl } from 'utils/routeHelpers';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import importFile from 'utils/importFile';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import PoliciesStore from 'stores/PoliciesStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  position?: 'left' | 'right' | 'center',
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
  @observable membersModalOpen: boolean = false;

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
      const document = await importFile({
        file: files[0],
        documents: this.props.documents,
        collectionId: this.props.collection.id,
      });
      this.props.history.push(document.url);
    } catch (err) {
      this.props.ui.showToast(err.message);
    }
  };

  onEdit = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-edit', { collection });
  };

  onDelete = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-delete', { collection });
  };

  onExport = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-export', { collection });
  };

  onPermissions = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.membersModalOpen = true;
  };

  handleMembersModalClose = () => {
    this.membersModalOpen = false;
  };

  render() {
    const { policies, collection, position, onOpen, onClose } = this.props;
    const can = policies.abilities(collection.id);

    return (
      <React.Fragment>
        <VisuallyHidden>
          <input
            type="file"
            ref={ref => (this.file = ref)}
            onChange={this.onFilePicked}
            onClick={ev => ev.stopPropagation()}
            accept="text/markdown, text/plain"
          />
        </VisuallyHidden>

        <Modal
          title="Collection permissions"
          onRequestClose={this.handleMembersModalClose}
          isOpen={this.membersModalOpen}
        >
          <CollectionMembers
            collection={collection}
            onSubmit={this.handleMembersModalClose}
            onEdit={this.onEdit}
          />
        </Modal>
        <DropdownMenu onOpen={onOpen} onClose={onClose} position={position}>
          {collection && (
            <React.Fragment>
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
                <DropdownMenuItem onClick={this.onEdit}>Edit…</DropdownMenuItem>
              )}
              {can.update && (
                <DropdownMenuItem onClick={this.onPermissions}>
                  Permissions…
                </DropdownMenuItem>
              )}
              {can.export && (
                <DropdownMenuItem onClick={this.onExport}>
                  Export…
                </DropdownMenuItem>
              )}
            </React.Fragment>
          )}
          {can.delete && (
            <DropdownMenuItem onClick={this.onDelete}>Delete…</DropdownMenuItem>
          )}
        </DropdownMenu>
      </React.Fragment>
    );
  }
}

export default inject('ui', 'documents', 'policies')(
  withRouter(CollectionMenu)
);
