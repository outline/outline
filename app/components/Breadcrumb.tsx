import { GoToIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import BreadcrumbMenu from "~/menus/BreadcrumbMenu";
import { undraggableOnDesktop } from "~/styles";
import { InternalLinkAction, MenuInternalLink } from "~/types";
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
}>;

function Breadcrumb(
  { actions, highlightFirstItem, children, max = 2 }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
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

  const toBreadcrumb = React.useCallback(
    (action: TopLevelAction, index: number) => {
      if (action.type === "menu") {
        return <BreadcrumbMenu key="menu" actions={action.actions} />;
      }

      const item = actionToMenuItem(action, actionContext) as MenuInternalLink;

      return (
        <>
          {item.icon}
          <Item
            to={item.to}
            $withIcon={!!item.icon}
            $highlight={!!highlightFirstItem && index === 0}
          >
            {item.title}
          </Item>
        </>
      );
    },
    [actionContext, highlightFirstItem]
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

const Item = styled(Link)<{ $highlight: boolean; $withIcon: boolean }>`
  ${ellipsis()}
  ${undraggableOnDesktop()}

  display: flex;
  flex-shrink: 1;
  min-width: 0;
  cursor: var(--pointer);
  color: ${s("text")};
  font-size: 15px;
  height: 24px;
  font-weight: ${(props) => (props.$highlight ? "500" : "inherit")};
  margin-left: ${(props) => (props.$withIcon ? "4px" : "0")};

  svg {
    flex-shrink: 0;
  }

  &:hover {
    text-decoration: underline;
  }
`;

export default React.forwardRef<HTMLDivElement, Props>(Breadcrumb);
