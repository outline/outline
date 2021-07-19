// @flow
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import Toast from "components/Toast";
import useStores from "hooks/useStores";

function Toasts() {
  const { toasts } = useStores();

  return (
    <List>
      {toasts.orderedData.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRequestClose={() => toasts.hideToast(toast.id)}
        />
      ))}
    </List>
  );
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

export default observer(Toasts);
