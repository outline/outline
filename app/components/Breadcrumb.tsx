import { GoToIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import BreadcrumbMenu from "~/menus/BreadcrumbMenu";
import { undraggableOnDesktop } from "~/styles";
import { MenuInternalLink } from "~/types";

type Props = React.PropsWithChildren<{
  items: MenuInternalLink[];
  max?: number;
  highlightFirstItem?: boolean;
}>;

function Breadcrumb(
  { items, highlightFirstItem, children, max = 2 }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const totalItems = items.length;
  const topLevelItems: MenuInternalLink[] = [...items];
  let overflowItems;

  // chop middle breadcrumbs and present a "..." menu instead
  if (totalItems > max) {
    const halfMax = Math.floor(max / 2);
    overflowItems = topLevelItems.splice(halfMax, totalItems - max);

    topLevelItems.splice(halfMax, 0, {
      to: "",
      type: "route",
      title: <BreadcrumbMenu items={overflowItems as MenuInternalLink[]} />,
    });
  }

  return (
    <Flex justify="flex-start" align="center" ref={ref}>
      {topLevelItems.map((item, index) => (
        <React.Fragment
          key={
            (typeof item.to === "string" ? item.to : item.to.pathname) || index
          }
        >
          {item.icon}
          {item.to ? (
            <Item
              to={item.to}
              $withIcon={!!item.icon}
              $highlight={!!highlightFirstItem && index === 0}
            >
              {item.title}
            </Item>
          ) : (
            item.title
          )}
          {index !== topLevelItems.length - 1 || !!children ? <Slash /> : null}
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
