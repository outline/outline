// @flow
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { darken } from 'polished';
import { layout, color } from 'styles/constants';
import { fadeAndScaleIn } from 'styles/animations';
import Icon from 'components/Icon';

@observer class Toasts extends Component {
  handleClose = index => {
    this.props.errors.remove(index);
  };

  render() {
    const { errors } = this.props;

    return (
      <List>
        {errors.errors.map((error, index) => (
          <Toast key={index} onClick={this.handleClose.bind(this, index)}>
            <Icon type="AlertCircle" light />
            <Message>{error}</Message>
          </Toast>
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

const Message = styled.div`
  padding-left: 5px;
`;

const Toast = styled.li`
  display: flex;
  align-items: center;
  animation: ${fadeAndScaleIn} 100ms ease;
  margin: 8px 0;
  padding: 8px;
  color: ${color.white};
  background: ${color.warning};
  font-size: 15px;
  border-radius: 5px;
  cursor: default;

  &:hover {
    background: ${darken(0.05, color.warning)};
  }
`;

export default inject('errors')(Toasts);
