// @flow
import * as React from 'react';
import { observer, Observer } from 'mobx-react';
import BaseModal from 'components/Modal';
import UiStore from 'stores/UiStore';
import CollectionNew from 'scenes/CollectionNew';
import CollectionEdit from 'scenes/CollectionEdit';
import CollectionDelete from 'scenes/CollectionDelete';
import CollectionExport from 'scenes/CollectionExport';
import DocumentDelete from 'scenes/DocumentDelete';
import DocumentShare from 'scenes/DocumentShare';

type Props = {
  ui: UiStore,
};

@observer
class Modals extends React.Component<Props> {
  handleClose = () => {
    this.props.ui.clearActiveModal();
  };

  render() {
    const Modal = ({ name, children, ...rest }) => {
      return (
        <Observer>
          {() => (
            <BaseModal
              isOpen={this.props.ui.activeModalName === name}
              onRequestClose={this.handleClose}
              {...rest}
            >
              {React.cloneElement(children, this.props.ui.activeModalProps)}
            </BaseModal>
          )}
        </Observer>
      );
    };

    return (
      <React.Fragment>
        <Modal name="collection-new" title="Create a collection">
          <CollectionNew onSubmit={this.handleClose} />
        </Modal>
        <Modal name="collection-edit" title="Edit collection">
          <CollectionEdit onSubmit={this.handleClose} />
        </Modal>
        <Modal name="collection-delete" title="Delete collection">
          <CollectionDelete onSubmit={this.handleClose} />
        </Modal>
        <Modal name="collection-export" title="Export collection">
          <CollectionExport onSubmit={this.handleClose} />
        </Modal>
        <Modal name="document-share" title="Share document">
          <DocumentShare onSubmit={this.handleClose} />
        </Modal>
        <Modal name="document-delete" title="Delete document">
          <DocumentDelete onSubmit={this.handleClose} />
        </Modal>
      </React.Fragment>
    );
  }
}

export default Modals;
