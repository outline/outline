// @flow
import React, { Component } from 'react';
import styled from 'styled-components';
import ReactModal from 'react-modal';

class Modal extends Component {
  render() {
    const {
      children,
      title = 'Untitled Modal',
      onRequestClose,
      ...rest
    } = this.props;

    return (
      <ReactModal
        contentLabel={title}
        onRequestClose={onRequestClose}
        {...rest}
      >
        <Header>
          <button onClick={onRequestClose}>Close</button>
          {title}
        </Header>
        {children}
      </ReactModal>
    );
  }
}

const Header = styled.div`
  text-align: center;
  font-weight: semibold;
`;

export default Modal;
