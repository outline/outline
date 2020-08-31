// @flow
import { observer, inject } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import UiStore from "../../stores/UiStore";
import Toast from "./components/Toast";

type Props = {
  ui: UiStore,
};
@observer
class Toasts extends React.Component<Props> {
  render() {
    const { ui } = this.props;

    return (
      <List>
        {ui.orderedToasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRequestClose={() => ui.removeToast(toast.id)}
          />
        ))}
      </List>
    );
  }
}

const List = styled.ol`
  position: fixed;
  left: ${(props) => props.theme.hpadding};
  bottom: ${(props) => props.theme.vpadding};
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: ${(props) => props.theme.depths.toasts};
`;

export default inject("ui")(Toasts);
