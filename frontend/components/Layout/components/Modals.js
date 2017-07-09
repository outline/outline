// @flow
import React, { Component } from 'react';
import Modal from 'react-modal';

class Modals extends Component {
  render() {
    const { name, component, onRequestClose, ...rest } = this.props;
    const isOpen = !!component;
    const ModalComponent = component;

    return (
      <Modal
        isOpen={isOpen}
        contentLabel={name}
        onRequestClose={onRequestClose}
      >
        <button onClick={onRequestClose}>Close</button>
        {isOpen && <ModalComponent {...rest} />}
      </Modal>
    );
  }
}

export default Modals;
