// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { capitalize } from 'lodash';
import styled from 'styled-components';
import { MoreIcon } from 'outline-icons';
import Modal from 'components/Modal';
import CollectionPermissions from 'scenes/CollectionPermissions';
import CollectionEdit from 'scenes/CollectionEdit';

import { newDocumentUrl } from 'utils/routeHelpers';
import getDataTransferFiles from 'utils/getDataTransferFiles';
import importFile from 'utils/importFile';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React.Node,
  position?: 'left' | 'right' | 'center',
  ui: UiStore,
  documents: DocumentsStore,
  collection: Collection,
  history: Object,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class CollectionMenu extends React.Component<Props> {
  file: ?HTMLInputElement;
  @observable editModalOpen: boolean = false;
  @observable permissionsModalOpen: boolean = false;
  @observable redirectTo: ?string;

  onNewDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.history.push(newDocumentUrl(collection.id));
  };

  onImportDocument = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();

    // simulate a click on the file upload input element
    if (this.file) this.file.click();
  };

  onFilePicked = async (ev: SyntheticEvent<*>) => {
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

  onDelete = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-delete', { collection });
  };

  onExport = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-export', { collection });
  };

  handlePermissionsModalOpen = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.permissionsModalOpen = true;
  };

  handlePermissionsModalClose = () => {
    this.permissionsModalOpen = false;
  };

  handleEditModalOpen = (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    this.editModalOpen = true;
  };

  handleEditModalClose = () => {
    this.editModalOpen = false;
  };

  render() {
    const { collection, label, position, onOpen, onClose } = this.props;
    const docType = collection.type === 'journal' ? 'post' : 'document';
    const collectionType =
      collection.type === 'journal' ? 'journal' : 'collection';

    return (
      <React.Fragment>
        <HiddenInput
          type="file"
          ref={ref => (this.file = ref)}
          onChange={this.onFilePicked}
          accept="text/markdown, text/plain"
        />
        <Modal
          title={`${capitalize(collectionType)} permissions`}
          onRequestClose={this.handlePermissionsModalClose}
          isOpen={this.permissionsModalOpen}
        >
          <CollectionPermissions
            collection={collection}
            onSubmit={this.handlePermissionsModalClose}
          />
        </Modal>
        <Modal
          title={`Edit ${collectionType}`}
          onRequestClose={this.handleEditModalClose}
          isOpen={this.editModalOpen}
        >
          <CollectionEdit
            collection={collection}
            onSubmit={this.handleEditModalClose}
          />
        </Modal>
        <DropdownMenu
          label={label || <MoreIcon />}
          onOpen={onOpen}
          onClose={onClose}
          position={position}
        >
          {collection && (
            <React.Fragment>
              <DropdownMenuItem onClick={this.onNewDocument}>
                New {docType}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={this.onImportDocument}>
                Import {docType}
              </DropdownMenuItem>
              <hr />
              <DropdownMenuItem onClick={this.handleEditModalOpen}>
                Edit…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={this.handlePermissionsModalOpen}>
                Permissions…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={this.onExport}>
                Export…
              </DropdownMenuItem>
            </React.Fragment>
          )}
          <DropdownMenuItem onClick={this.onDelete}>Delete…</DropdownMenuItem>
        </DropdownMenu>
      </React.Fragment>
    );
  }
}

const HiddenInput = styled.input`
  position: absolute;
  top: -100px;
  left: -100px;
  visibility: hidden;
`;

export default inject('ui', 'documents')(withRouter(CollectionMenu));
