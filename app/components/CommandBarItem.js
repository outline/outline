// @flow
import { BackIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";
import Key from "components/Key";
import type { CommandBarAction } from "types";

type Props = {|
  action: CommandBarAction,
  active: Boolean,
|};

function CommandBarItem({ action, active }: Props, ref) {
  return (
    <Item active={active} ref={ref}>
      <Text align="center" gap={8}>
        <Icon>
          {action.icon ? (
            React.cloneElement(action.icon, { size: 22 })
          ) : (
            <ForwardIcon color="currentColor" size={22} />
          )}
        </Icon>
        {action.name}
        {action.children?.length ? "…" : ""}
      </Text>
      {action.shortcut?.length ? (
        <div style={{ display: "grid", gridAutoFlow: "column", gap: "4px" }}>
          {action.shortcut.map((sc) => (
            <Key key={sc}>{sc}</Key>
          ))}
        </div>
      ) : null}
    </Item>
  );
}

const Icon = styled.div`
  width: 22px;
  height: 22px;
  color: ${(props) => props.theme.textSecondary};
`;

const Text = styled(Flex)`
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
`;

const Item = styled.div`
  font-size: 15px;
  padding: 12px 16px;
  background: ${(props) =>
    props.active ? props.theme.menuItemSelected : "none"};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  min-width: 0;
`;

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
`;

export default React.forwardRef<Props, HTMLDivElement>(CommandBarItem);
