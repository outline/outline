// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';

import getDataTransferFiles from 'utils/getDataTransferFiles';
import importFile from 'utils/importFile';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import MoreIcon from 'components/Icon/MoreIcon';
import Flex from 'shared/components/Flex';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  label?: React$Element<*>,
  onOpen?: () => void,
  onClose?: () => void,
  history: Object,
  ui: UiStore,
  documents: DocumentsStore,
  collection: Collection,
};

@observer
class CollectionMenu extends Component {
  props: Props;
  file: HTMLInputElement;

  onNewDocument = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { collection, history } = this.props;
    history.push(`${collection.url}/new`);
  };

  onImportDocument = (ev: SyntheticEvent) => {
    ev.preventDefault();

    // simulate a click on the file upload input element
    this.file.click();
  };

  onFilePicked = (ev: SyntheticEvent) => {
    const files = getDataTransferFiles(ev);

    importFile(
      {
        file: files[0],
        documents: this.props.documents,
        collectionId: this.props.collection.id,
      },
      document => {
        this.props.history.push(document.url);
      }
    );
  };

  onEdit = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-edit', { collection });
  };

  onDelete = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-delete', { collection });
  };

  render() {
    const { collection, label, onOpen, onClose } = this.props;
    const { allowDelete } = collection;

    return (
      <span>
        <HiddenInput
          type="file"
          innerRef={ref => (this.file = ref)}
          onChange={this.onFilePicked}
          accept="text/markdown, text/plain"
        />
        <DropdownMenu
          label={label || <MoreIcon />}
          onOpen={onOpen}
          onClose={onClose}
        >
          {collection && (
            <Flex column>
              <DropdownMenuItem onClick={this.onNewDocument}>
                New document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={this.onImportDocument}>
                Import document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={this.onEdit}>Edit…</DropdownMenuItem>
            </Flex>
          )}
          {allowDelete && (
            <DropdownMenuItem onClick={this.onDelete}>Delete…</DropdownMenuItem>
          )}
        </DropdownMenu>
      </span>
    );
  }
}

const HiddenInput = styled.input`
  position: absolute;
  top: -100px;
  left: -100px;
  visibility: hidden;
`;

export default inject('ui', 'documents')(CollectionMenu);
