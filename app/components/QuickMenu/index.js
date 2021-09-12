// @flow
import { motion } from "framer-motion";
import { observer } from "mobx-react";
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
import { fadeAndSlideUp } from "styles/animations";

function QuickMenu() {
  const { quickMenu } = useStores();
  const dialog = useDialogState({ modal: true, animated: 250 });
  const [isClicked, setIsClicked] = React.useState(false);
  const [activeCommand, setActiveCommand] = React.useState<number>(1);
  const activeCommandRef = React.useRef();
  const { t } = useTranslation();
  let order = 0;

  React.useEffect(() => {
    setActiveCommand(1);
  }, [quickMenu.resolvedMenuItems]);

  React.useEffect(() => {
    if (!dialog.visible) {
      quickMenu.reset();
      setActiveCommand(1);
    }
  }, [quickMenu, dialog.visible]);

  React.useEffect(() => {
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
      quickMenu.reset();
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

  const handleAnimation = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 100);
  };

  const constructBlock = (item, order, setActiveCommand) => {
    return (
      <CommandItem
        tabIndex="0"
        data-order={order}
        role="option"
        ref={activeCommand === order ? activeCommandRef : undefined}
        onMouseEnter={() => setActiveCommand(order)}
        aria-selected={activeCommand === order}
        selected={activeCommand === order}
        onClick={(e) => {
          handleAnimation();
          if (item.items) quickMenu.handleNestedItems(item);
          else {
            dialog.hide();
            item.onClick(e);
          }
        }}
        onFocus={() => {
          setActiveCommand(order);
        }}
      >
        <Container align="center">
          <MenuIconWrapper>{item.icon}</MenuIconWrapper>
          {item.title}
        </Container>
      </CommandItem>
    );
  };

  console.log("dataaa: ", quickMenu.resolvedMenuItems);
  const data = quickMenu.resolvedMenuItems?.map((context) => {
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

  const term = quickMenu.searchTerm;
  const variant = {
    open: { scale: 0.9, transition: "ease" },
    closed: { scale: 1, transition: "ease" },
  };

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
              <motion.div
                animate={isClicked ? "open" : "closed"}
                variants={variant}
              >
                <Content {...props} column>
                  <Badges>
                    {quickMenu.path.map((b) => (
                      <Path
                        onClick={() => {
                          handleAnimation();
                          quickMenu.handlePathClick(b);
                        }}
                        key={b}
                      >
                        {b}
                      </Path>
                    ))}
                  </Badges>
                  <InputWrapper>
                    <InputSearch onChange={handleChange} value={term} />
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
              </motion.div>
            )}
          </Dialog>
        </Backdrop>
      )}
    </DialogBackdrop>
  );
}

const Path = styled.span`
  margin-left: 10px;
  padding: 1px 5px 2px;
  border: 1px solid;
  background-color: ${({ theme }) => theme.slateLight};
  color: ${({ theme }) => theme.slateDark};
  border: 1px solid ${({ theme }) => theme.slateLight};
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  user-select: none;
  cursor: pointer;
`;

const Badges = styled.div`
  margin-top: 10px;
  margin-left: 10px;
`;

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
  animation: ${fadeAndSlideUp} 200ms ease-in-out;
  transform-origin: 25% 0;
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.backdrop};
  z-index: ${(props) => props.theme.depths.modalOverlay};
`;

export default observer(QuickMenu);
