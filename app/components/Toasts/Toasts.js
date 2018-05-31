// @flow
import * as React from 'react';
import { inject, observer } from 'mobx-react';
import styled from 'styled-components';
import { layout } from 'shared/styles/constants';
import Toast from './components/Toast';

@observer
class Toasts extends React.Component<*> {
  handleClose = index => {
    this.props.ui.remove(index);
  };

  render() {
    const { ui } = this.props;

    return (
      <List>
        {ui.toasts.map((error, index) => (
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

export default inject('ui')(Toasts);
