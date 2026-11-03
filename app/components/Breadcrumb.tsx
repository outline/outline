import { GoToIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import BreadcrumbMenu from "~/menus/BreadcrumbMenu";
import { undraggableOnDesktop } from "~/styles";
import type { InternalLinkAction, MenuInternalLink } from "~/types";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import { useComputed } from "~/hooks/useComputed";

type TopLevelAction =
  | InternalLinkAction
  | { type: "menu"; actions: InternalLinkAction[] };

type Props = React.PropsWithChildren<{
  actions: InternalLinkAction[];
  max?: number;
  highlightFirstItem?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}>;

function Breadcrumb({
  actions,
  highlightFirstItem,
  children,
  max = 2,
  ref,
}: Props) {
  const actionContext = useActionContext({ isMenu: true });

  const visibleActions = useComputed(
    () =>
      actions.filter((action) =>
        typeof action.visible === "function"
          ? action.visible(actionContext)
          : (action.visible ?? true)
      ),
    [actions, actionContext]
  );
  const totalVisibleActions = visibleActions.length;

  const topLevelActions: TopLevelAction[] = [...visibleActions];

  // chop middle breadcrumbs and present a "..." menu instead
  if (totalVisibleActions > max) {
    const halfMax = Math.floor(max / 2);
    const menuActions = topLevelActions.splice(
      halfMax,
      totalVisibleActions - max
    ) as InternalLinkAction[];

    topLevelActions.splice(halfMax, 0, {
      type: "menu",
      actions: menuActions,
    });
  }

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.currentTarget.querySelector('[data-state="open"]')) {
        event.preventDefault();
      }
    },
    []
  );

  const toBreadcrumb = React.useCallback(
    (action: TopLevelAction, index: number) => {
      if (action.type === "menu") {
        return <BreadcrumbMenu key="menu" actions={action.actions} />;
      }

      const item = actionToMenuItem(action, actionContext) as MenuInternalLink;
      const highlight = !!highlightFirstItem && index === 0;

      // Items without a destination are shown as plain text.
      if (!item.to) {
        return (
          <StaticItem $highlight={highlight}>
            {item.icon}
            <Title>{item.title}</Title>
          </StaticItem>
        );
      }

      return (
        <Item to={item.to} onClick={handleClick} $highlight={highlight}>
          {item.icon}
          <Title>{item.title}</Title>
        </Item>
      );
    },
    [actionContext, handleClick, highlightFirstItem]
  );

  return (
    <Flex justify="flex-start" align="center" ref={ref}>
      {topLevelActions.map((action, index) => (
        <React.Fragment key={action.type === "menu" ? "menu" : `item-${index}`}>
          {toBreadcrumb(action, index)}
          {index !== topLevelActions.length - 1 || !!children ? (
            <Slash />
          ) : null}
        </React.Fragment>
      ))}
      {children}
    </Flex>
  );
}

const Slash = styled(GoToIcon)`
  flex-shrink: 0;
  fill: ${s("divider")};
`;

const itemStyles = css<{ $highlight: boolean }>`
  ${undraggableOnDesktop()}

  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
  color: ${s("text")};
  font-size: 15px;
  height: 32px;
  font-weight: ${(props) => (props.$highlight ? "500" : "inherit")};
  padding-inline: 8px;
  border-radius: 4px;
  margin-inline: -4px;

  &:first-child {
    margin-inline-start: 0;
  }
  max-width: 460px;
`;

const Item = styled(Link)<{ $highlight: boolean }>`
  ${itemStyles}
  cursor: var(--pointer);
  transition: background 100ms ease-in-out;

  &:hover,
  &:has([data-state="open"]) {
    background: ${s("buttonNeutralHoverBackground")};
    transition: none;
  }
`;

const StaticItem = styled.span<{ $highlight: boolean }>`
  ${itemStyles}
  cursor: default;
`;

const Title = styled.span`
  ${ellipsis()}
  min-width: 0;
`;

export default observer(Breadcrumb);
