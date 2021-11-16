import { BackIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";
import Key from "components/Key";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { CommandBarAction } from "types";

type Props = {
  action: CommandBarAction;
  active: boolean;
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ref' implicitly has an 'any' type.
function CommandBarItem({ action, active }: Props, ref) {
  return (
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    <Item active={active} ref={ref}>
      <Text align="center" gap={8}>
        <Icon>
          {action.icon ? (
            React.cloneElement(action.icon, {
              size: 22,
            })
          ) : (
            <ForwardIcon color="currentColor" size={22} />
          )}
        </Icon>
        {action.name}
        {action.children?.length ? "…" : ""}
      </Text>
      {action.shortcut?.length ? (
        <div
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gap: "4px",
          }}
        >
          {action.shortcut.map((sc: string) => (
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'active' does not exist on type 'ThemedSt... Remove this comment to see the full error message
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

export default React.forwardRef<HTMLDivElement, Props>(CommandBarItem);
