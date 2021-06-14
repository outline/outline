// @flow
import { GoToIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Flex from "components/Flex";
import BreadcrumbMenu from "menus/BreadcrumbMenu";

type MenuItem = {|
  icon?: React.Node,
  title: React.Node,
  to?: string,
|};

type Props = {|
  items: MenuItem[],
  max?: number,
  children?: React.Node,
  highlightFirstItem?: boolean,
|};

function Breadcrumb({ items, highlightFirstItem, children, max = 2 }: Props) {
  const totalItems = items.length;
  let topLevelItems: MenuItem[] = [...items];
  let overflowItems;

  // chop middle breadcrumbs and present a "..." menu instead
  if (totalItems > max) {
    const halfMax = Math.floor(max / 2);
    overflowItems = topLevelItems.splice(halfMax, totalItems - max);
    topLevelItems.splice(halfMax, 0, {
      title: <BreadcrumbMenu items={overflowItems} />,
    });
  }

  return (
    <Flex justify="flex-start" align="center">
      {topLevelItems.map((item, index) => (
        <React.Fragment key={item.to || index}>
          {item.icon}
          {item.to ? (
            <Item
              to={item.to}
              $withIcon={!!item.icon}
              $highlight={highlightFirstItem && index === 0}
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
  fill: ${(props) => props.theme.divider};
`;

const Item = styled(Link)`
  display: flex;
  flex-shrink: 1;
  min-width: 0;
  color: ${(props) => props.theme.text};
  font-size: 15px;
  height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  font-weight: ${(props) => (props.$highlight ? "500" : "inherit")};
  margin-left: ${(props) => (props.$withIcon ? "4px" : "0")};

  svg {
    flex-shrink: 0;
  }

  &:hover {
    text-decoration: underline;
  }
`;

export default Breadcrumb;
