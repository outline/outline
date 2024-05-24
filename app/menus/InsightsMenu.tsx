import { t } from "i18next";
import { MoreIcon } from "outline-icons";
import React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "~/components/NewContextMenu";
import MenuIconWrapper from "~/components/NewContextMenu/MenuIconWrapper";
import NudeButton from "~/components/NudeButton";
import { actionToMenuItem } from "~/actions";
import { toggleViewerInsights } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import { hover } from "~/styles";
import { type MenuItemButton } from "~/types";

const InsightsMenu: React.FC = () => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <ContextMenu>
      <ContextMenuTrigger ref={triggerRef} asChild>
        <Button>
          <MoreIcon />
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent ref={contentRef} aria-label={t("Viewer insights")}>
        <ToggleViewerInsights />
      </ContextMenuContent>
    </ContextMenu>
  );
};

const ToggleViewerInsights: React.FC = () => {
  const context = useActionContext();
  const menuItem = actionToMenuItem(
    toggleViewerInsights,
    context
  ) as MenuItemButton;

  return menuItem.visible ? (
    <ContextMenuItem
      onSelect={(e: Event) =>
        menuItem.onClick(e as unknown as React.MouseEvent<HTMLButtonElement>)
      }
    >
      <MenuIconWrapper>{menuItem.icon}</MenuIconWrapper>
      {menuItem.title}
    </ContextMenuItem>
  ) : null;
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
