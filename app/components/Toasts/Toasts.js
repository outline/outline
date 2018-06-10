// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Toast from './components/Toast';
import UiStore from '../../stores/UiStore';

type Props = {
  ui: UiStore,
};
@observer
class Toasts extends React.Component<Props> {
  handleClose = (index: number) => {
    this.props.ui.removeToast(index);
  };

  render() {
    const { ui } = this.props;

    return (
      <List>
        {ui.toasts.map((toast, index) => (
          <Toast
            key={index}
            onRequestClose={this.handleClose.bind(this, index)}
            toast={toast}
          />
        ))}
      </List>
    );
  }
}

const List = styled.ol`
  position: fixed;
  left: ${props => props.theme.hpadding};
  bottom: ${props => props.theme.vpadding};
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: 1000;
`;

export default Toasts;
