import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Toast from "~/components/Toast";
import useStores from "~/hooks/useStores";
import { Toast as TToast } from "~/types";

function Toasts() {
  const { toasts } = useStores();
  return (
    <List>
      {toasts.orderedData.map((toast: TToast) => (
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
  left: 16px;
  bottom: 16px;
  list-style: none;
  margin: 0;
  padding: 0;
  z-index: ${depths.toasts};
`;

export default observer(Toasts);
