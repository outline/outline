// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';

import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import Icon from 'components/Icon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class CollectionMenu extends Component {
  props: {
    label?: React$Element<any>,
    onShow?: Function,
    onClose?: Function,
    history: Object,
    ui: UiStore,
    collection: Collection,
  };

  onEdit = () => {
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-edit', { collection });
  };

  onDelete = () => {
    const { collection } = this.props;
    this.props.ui.setActiveModal('collection-delete', { collection });
  };

  render() {
    const { collection, label, onShow, onClose } = this.props;
    const { allowDelete } = collection;

    return (
      <DropdownMenu
        label={label || <MoreIcon type="MoreHorizontal" />}
        onShow={onShow}
        onClose={onClose}
      >
        {collection &&
          <DropdownMenuItem onClick={this.onEdit}>Edit</DropdownMenuItem>}
        {allowDelete &&
          <DropdownMenuItem onClick={this.onDelete}>Delete</DropdownMenuItem>}
      </DropdownMenu>
    );
  }
}

const MoreIcon = styled(Icon)`
  width: 22px;
  height: 22px;
`;

export default inject('ui')(CollectionMenu);
