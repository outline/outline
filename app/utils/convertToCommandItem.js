// @flow
import styled from "styled-components";
import { type MenuItem as TMenuItem } from "types";

type CommandItem = {|
  title: React.Node,
  icon?: React.Node,
  onClick: (event: SyntheticEvent<>) => void | Promise<void>,
|};

const convertToCommandItem = (data: TMenuItem[]) => {
  return data.reduce((agg: CommandItem[], item) => {
    if (
      item.type === "separator" ||
      !item.visible ||
      item.disabled ||
      item.type === "heading"
    ) {
      return agg;
    }

    let newItem;

    if (item.to) {
      newItem = {
        title: item.title,
        icon: item.icon || <MenuIconWrapper />,
        onClick: () => (window.location.href = item.to),
      };
    }

    if (item.href) {
      newItem = {
        title: item.title,
        icon: item.icon || <MenuIconWrapper />,
        onClick: () => (window.location.href = item.href),
      };
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
