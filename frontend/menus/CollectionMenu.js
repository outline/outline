// @flow
import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import Collection from 'models/Collection';
import UiStore from 'stores/UiStore';
import Icon from 'components/Icon';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

@observer class CollectionMenu extends Component {
  props: {
    label?: React$Element<any>,
    history: Object,
    ui: UiStore,
    collection: Collection,
  };

  onNewDocument = () => {
    const { collection, history } = this.props;
    history.push(`${collection.url}/new`);
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
    const { collection, label } = this.props;
    const { allowDelete } = collection;

    return (
      <DropdownMenu label={label || <Icon type="MoreHorizontal" />}>
        {collection &&
          <DropdownMenuItem onClick={this.onNewDocument}>
            New document
          </DropdownMenuItem>}
        {collection &&
          <DropdownMenuItem onClick={this.onEdit}>Edit</DropdownMenuItem>}
        {allowDelete &&
          <DropdownMenuItem onClick={this.onDelete}>Delete</DropdownMenuItem>}
      </DropdownMenu>
    );
  }
}

export default withRouter(inject('ui')(CollectionMenu));
