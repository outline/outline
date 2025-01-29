import { t } from "i18next";
import { MoreIcon } from "outline-icons";
import React from "react";
import { MenuButton, useMenuState } from "reakit/Menu";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import NudeButton from "~/components/NudeButton";
import { actionToMenuItem } from "~/actions";
import { toggleViewerInsights } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import { MenuItem } from "~/types";

const InsightsMenu: React.FC = () => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menu = useMenuState();
  const context = useActionContext();
  const items: MenuItem[] = [actionToMenuItem(toggleViewerInsights, context)];

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button {...props}>
            <MoreIcon />
          </Button>
        )}
      </MenuButton>
      <ContextMenu {...menu} menuRef={menuRef} aria-label={t("Notification")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
};

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:${hover},
  &:active {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

export default InsightsMenu;
