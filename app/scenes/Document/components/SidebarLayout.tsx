import { observer } from "mobx-react";
import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { PortalContext } from "~/components/Portal";
import { RightSidebarWrappedContext } from "~/components/RightSidebarContext";
import Scrollable from "~/components/Scrollable";
import RightSidebar from "~/components/Sidebar/Right";
import Tooltip from "~/components/Tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "~/components/primitives/Drawer";
import useMobile from "~/hooks/useMobile";
import { draggableOnDesktop } from "~/styles";

type Props = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  /* The title of the sidebar */
  title: React.ReactNode;
  /* The content of the sidebar */
  children: React.ReactNode;
  /* Called when the sidebar is closed */
  onClose?: () => void;
  /* Whether the sidebar should be scrollable */
  scrollable?: boolean;
};

function SidebarLayout({ title, onClose, children, scrollable = true }: Props) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const isWrapped = React.useContext(RightSidebarWrappedContext);
  const [drawerElement, setDrawerElement] =
    React.useState<HTMLDivElement | null>(null);

  const content = scrollable ? (
    <Scrollable hiddenScrollbars topShadow>
      {children}
    </Scrollable>
  ) : (
    children
  );

  if (isMobile) {
    return (
      <Drawer onClose={onClose} defaultOpen>
        <DrawerContent ref={setDrawerElement}>
          <DrawerTitle>{title}</DrawerTitle>
          <PortalContext.Provider value={drawerElement}>
            {content}
          </PortalContext.Provider>
        </DrawerContent>
      </Drawer>
    );
  }

  const inner = (
    <>
      <Header>
        <Title>{title}</Title>
        <Tooltip content={t("Close")} shortcut="Esc">
          <Button
            icon={<ForwardIcon />}
            onClick={onClose}
            borderOnHover
            neutral
          />
        </Tooltip>
      </Header>
      {content}
    </>
  );

  if (isWrapped) {
    return inner;
  }

  return <RightSidebar>{inner}</RightSidebar>;
}

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
  flex-shrink: 0;
`;

const Title = styled(Flex)`
  ${ellipsis()}
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  user-select: none;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  ${draggableOnDesktop()}
  align-items: center;
  position: relative;
  padding: 16px 12px 16px 16px;
  color: ${s("text")};
  flex-shrink: 0;
`;

export default observer(SidebarLayout);
