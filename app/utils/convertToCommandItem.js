// @flow
import History from "history";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { type MenuItem as TMenuItem } from "types";

type CommandItem = {|
  title: React.Node,
  icon?: React.Node,
  onClick: (event: SyntheticEvent<>) => void | Promise<void>,
  items?: CommandItem[],
|};

const convertToCommandItem = (data: TMenuItem[], history: History<>) => {
  return data.reduce((agg: CommandItem[], item) => {
    if (
      item.type === "separator" ||
      item.visible === false ||
      item.disabled === true ||
      item.type === "heading"
    ) {
      return agg;
    }

    const newItem: CommandItem = {
      title: item.title,
      icon: item.icon || <MenuIconWrapper />,
      onClick: () => {},
    };

    if (item.selected) {
      newItem.icon = (
        <MenuIconWrapper>
          <CheckmarkIcon color="currentColor" />
        </MenuIconWrapper>
      );
    }

    if (item.to) {
      newItem.onClick = () => {
        history.push(item.to);
      };
    }

    if (item.href) {
      newItem.onClick = () => {
        window.location.href = item.href;
      };
    }

    if (item.onClick) {
      newItem.onClick = item.onClick;
    }

    if (item.items) {
      newItem.onClick = () => {};
      newItem.items = convertToCommandItem(item.items);
    }

    return [...agg, newItem];
  }, []);
};

const MenuIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

export default convertToCommandItem;
