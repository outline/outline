// @flow
import { observer } from "mobx-react";
import { CheckmarkIcon, LinkIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";
import { Dialog, DialogBackdrop, useDialogState } from "reakit/Dialog";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import Header from "components/ContextMenu/Header";
import Flex from "components/Flex";
import Scrollable from "components/Scrollable";
import InputSearch from "../InputSearch";
import useStores from "hooks/useStores";

function QuickMenu() {
  const { quickMenu } = useStores();
  const dialog = useDialogState({ modal: true, animated: 250 });
  const [activeCommand, setActiveCommand] = React.useState<number>(1);
  const activeCommandRef = React.useRef();
  const { t } = useTranslation();
  let order = 0;

  React.useLayoutEffect(() => {
    if (!dialog.visible) {
      quickMenu.reset();
      setActiveCommand(1);
    }
  }, [quickMenu, dialog.visible]);

  React.useLayoutEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "k") {
        dialog.show();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  React.useEffect(() => {
    if (activeCommandRef.current) {
      console.log("calling on", activeCommandRef.current);
      scrollIntoView(activeCommandRef.current, {
        scrollMode: "if-needed",
        behavior: "instant",
      });
    }
  });

  const handleChange = (event) => {
    event.preventDefault();
    event.stopPropagation();
    quickMenu.setSearchTerm(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.currentTarget.value && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      quickMenu.setSearchTerm("");
    }

    if (event.key === "ArrowDown") {
      setActiveCommand((prev) => (prev < order ? ++prev : prev));
    }
    if (event.key === "ArrowUp") {
      setActiveCommand((prev) => (prev > 1 ? --prev : prev));
    }

    if (event.key === "Enter" && activeCommandRef.current) {
      activeCommandRef.current.click();
    }
  };

  const constructBlock = (item, order, setActiveCommand) => {
    if (item.to || item.href || item.onClick) {
      return (
        <CommandItem
          tabIndex="0"
          data-order={order}
          role="option"
          ref={activeCommand === order ? activeCommandRef : undefined}
          onMouseOver={() => setActiveCommand(order)}
          aria-selected={activeCommand === order}
          selected={activeCommand === order}
          onClick={
            item.to || item.href
              ? () => (window.location.href = item.to ? item.to : item.href)
              : item.onClick
          }
          onFocus={() => {
            setActiveCommand(order);
          }}
        >
          <Container align="center">
            {item.selected !== undefined && (
              <>
                {item.selected ? (
                  <MenuIconWrapper>
                    <CheckmarkIcon color="currentColor" />
                  </MenuIconWrapper>
                ) : (
                  <MenuIconWrapper />
                )}
                &nbsp;
              </>
            )}
            {item.selected === undefined && (
              <MenuIconWrapper>
                {item.icon ? (
                  item.icon
                ) : item.href || item.to ? (
                  <LinkIcon />
                ) : null}
              </MenuIconWrapper>
            )}
            {item.title}
          </Container>
        </CommandItem>
      );
    }
    console.log("unhandled item", item);
    return <div>{item?.title}</div>;
  };

  const data = quickMenu.resolvedMenuItems.map((context) => {
    return (
      <>
        <Header>{context.title}</Header>
        <CommandList role="group">
          {context.items.map((item) =>
            constructBlock(item, ++order, setActiveCommand)
          )}
        </CommandList>
      </>
    );
  });

  console.log(activeCommand);

  const term = quickMenu.searchTerm;

  return (
    <DialogBackdrop {...dialog}>
      {(props) => (
        <Backdrop {...props}>
          <Dialog
            {...dialog}
            aria-label={t("Quick menu")}
            hideOnEsc
            onKeyDown={handleKeyDown}
          >
            {(props) => (
              <Content {...props} column>
                <InputWrapper>
                  <InputSearch
                    // onKeyDown={handleKeyDown}
                    onChange={handleChange}
                    value={term}
                  />
                </InputWrapper>
                <Results>
                  <AutoSizer>
                    {({ width, height }) => (
                      <Wrapper width={width} height={height}>
                        <Scrollable topShadow>{data}</Scrollable>
                      </Wrapper>
                    )}
                  </AutoSizer>
                </Results>
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

const Results = styled.div`
  height: calc(100% - 64px);
  width: 100%;
`;

const MenuIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const Container = styled(Flex)`
  width: 100%;
  height: 100%;
`;

const CommandItem = styled.li`
  display: flex;
  align-items: center;
  height: 48px;
  font-family: var(--font-main);
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  padding: 0 16px;
  background: transparent;
  color: var(--gray6);
  white-space: nowrap;
  -webkit-transition: color 0.1s cubic-bezier(0, 0, 0.2, 1);
  transition: color 0.1s cubic-bezier(0, 0, 0.2, 1);
  cursor: pointer;
  outline: none;

  ${(props) =>
    props.selected && {
      color: `${props.theme.white}`,
      background: `${props.theme.primary}`,
      boxShadow: "none",
      cursor: "pointer",
      svg: {
        fill: `${props.theme.white}`,
      },
    }}
`;

const CommandList = styled.ul`
  list-style-type: none;
  margin: 0;
  padding: 0;
`;

const Wrapper = styled(Flex)`
  height: ${(props) => props.height + "px"};
  width: ${(props) => props.width + "px"};
  flex: 1 1 auto;
`;

const Content = styled(Flex)`
  background: ${(props) => props.theme.background};
  width: 40vw;
  height: 50vh;
  border-radius: 8px;
  flex: 1;
  overflow: hidden;
  margin: 20vh auto;
  box-shadow: ${(props) => props.theme.menuShadow};
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${(props) => props.theme.depths.modalOverlay};
`;

export default observer(QuickMenu);
