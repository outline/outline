// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import BaseModal from 'components/Modal';
import UiStore from 'stores/UiStore';
import CollectionNew from 'scenes/CollectionNew';
import CollectionEdit from 'scenes/CollectionEdit';
import CollectionDelete from 'scenes/CollectionDelete';
import DocumentDelete from 'scenes/DocumentDelete';
import KeyboardShortcuts from 'scenes/KeyboardShortcuts';
import MarkdownShortcuts from 'scenes/MarkdownShortcuts';
import Settings from 'scenes/Settings';

@observer class Modals extends Component {
  props: {
    ui: UiStore,
  };

  handleClose = () => {
    this.props.ui.clearActiveModal();
  };

  render() {
    const { activeModalName, activeModalProps } = this.props.ui;

    const Modal = ({ name, children, ...rest }) => {
      return (
        <BaseModal
          isOpen={activeModalName === name}
          onRequestClose={this.handleClose}
          {...rest}
        >
          {React.cloneElement(children, activeModalProps)}
        </BaseModal>
      );
    };

    return (
      <span>
        <Modal name="collection-new" title="Create a collection">
          <CollectionNew onSubmit={this.handleClose} />
        </Modal>
        <Modal name="collection-edit" title="Edit collection">
          <CollectionEdit onSubmit={this.handleClose} />
        </Modal>
        <Modal name="collection-delete" title="Delete collection">
          <CollectionDelete onSubmit={this.handleClose} />
        </Modal>
        <Modal name="document-delete" title="Delete document">
          <DocumentDelete onSubmit={this.handleClose} />
        </Modal>
        <Modal name="keyboard-shortcuts" title="Keyboard shortcuts">
          <KeyboardShortcuts />
        </Modal>
        <Modal name="markdown-shortcuts" title="Markdown formatting">
          <MarkdownShortcuts />
        </Modal>
        <Modal name="settings" title="Settings">
          <Settings />
        </Modal>
      </span>
    );
  }
}

export default Modals;
