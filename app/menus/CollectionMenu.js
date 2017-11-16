// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import MoreIcon from 'components/Icon/MoreIcon';
import Flex from 'shared/components/Flex';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer
class CollectionMenu extends Component {
  props: {
    label?: React$Element<*>,
    onOpen?: () => void,
    onClose?: () => void,
    onImport?: () => void,
    history: Object,
    ui: UiStore,
    collection: Collection,
  };

  onNewDocument = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const { collection, history } = this.props;
    history.push(`${collection.url}/new`);
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
    const { collection, label, onOpen, onClose, onImport } = this.props;
    const { allowDelete } = collection;

    return (
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
            <DropdownMenuItem onClick={onImport}>
              Import document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={this.onEdit}>Edit…</DropdownMenuItem>
          </Flex>
        )}
        {allowDelete && (
          <DropdownMenuItem onClick={this.onDelete}>Delete…</DropdownMenuItem>
        )}
      </DropdownMenu>
    );
  }
}

export default inject('ui')(CollectionMenu);
