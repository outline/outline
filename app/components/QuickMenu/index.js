// @flow
import { observer } from "mobx-react";
import { transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import styled from "styled-components";
import Template from "components/ContextMenu/Template";
import InputSearch from "components/InputSearch";
import Scrollable from "components/Scrollable";
import useStores from "hooks/useStores";
import useUnmount from "hooks/useUnmount";

function QuickMenu() {
  const { quickMenu } = useStores();
  const dialog = useDialogState({ modal: true, animated: 250 });
  const { t } = useTranslation();

  const handleSearchChange = React.useCallback(
    (event) => {
      quickMenu.setSearchTerm(event.target.value);
    },
    [quickMenu]
  );

  useUnmount(() => quickMenu.setSearchTerm(""));

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "k" && event.metaKey) {
        dialog.visible ? dialog.hide() : dialog.show();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            aria-label={t("Quick menu")}
            preventBodyScroll
            hideOnEsc
          >
            {(props) => (
              <Content {...props}>
                <InputWrapper>
                  <InputSearch
                    onChange={handleSearchChange}
                    placeholder={`${t("Search actions")}…`}
                  />
                </InputWrapper>
                <Scrollable topShadow>
                  {quickMenu.orderedData.map((context) => (
                    <Template
                      key={context.id}
                      {...dialog}
                      items={[
                        {
                          type: "heading",
                          title: context.title,
                          visible: true,
                        },
                        ...context.items.filter(
                          // $FlowFixMe
                          (item) => item.type !== "separator"
                        ),
                      ]}
                    />
                  ))}
                </Scrollable>
              </Content>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
}

const InputWrapper = styled.div`
  padding: 16px;
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 40vw;
  height: 50vh;
  border-radius: 8px;
  margin: 20vh auto;
  box-shadow: ${(props) => props.theme.menuShadow};
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    transparentize(0.25, props.theme.background)} !important;
  z-index: ${(props) => props.theme.depths.modalOverlay};
  transition: opacity 50ms ease-in-out;
  opacity: 0;

  &[data-enter] {
    opacity: 1;
  }
`;

export default observer(QuickMenu);
