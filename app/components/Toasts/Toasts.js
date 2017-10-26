// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { layout } from 'styles/constants';
import Toast from './components/Toast';

@observer class Toasts extends Component {
  handleClose = index => {
    this.props.errors.remove(index);
  };

  render() {
    const { errors } = this.props;

    return (
      <List>
        {errors.data.map((error, index) => (
          <Toast
            key={index}
            onRequestClose={this.handleClose.bind(this, index)}
            message={error}
          />
        ))}
      </List>
    );
  }
}

const List = styled.ol`
  position: fixed;
  left: ${layout.hpadding};
  bottom: ${layout.vpadding};
  list-style: none;
  margin: 0;
  padding: 0;
`;

export default inject('errors')(Toasts);
