// @flow
import { useResultItem } from "kbar";
import { BackIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import Flex from "components/Flex";
import Key from "components/Key";
import { CommandBarOptions } from "./CommandBar";
import type { CommandBarAction } from "types";

type Props = {|
  action: CommandBarAction,
|};

export default function CommandBarItem({ action }: Props) {
  const { handlers, active } = useResultItem({ action });
  const ownRef = React.useRef<?HTMLDivElement>(null);

  React.useEffect(() => {
    if (active) {
      // wait for the height animtion, _then_ scrollIntoView.
      setTimeout(() => {
        const element = ownRef.current;
        if (!element) {
          return;
        }
        element.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
          inline: "start",
        });
      }, CommandBarOptions.animations.enterMs / 2);
    }
  }, [active]);

  return (
    <Item ref={ownRef} active={active} {...handlers}>
      <Flex align="center" gap={8}>
        <Icon>
          {action.icon ? (
            React.cloneElement(action.icon, { size: 22 })
          ) : (
            <ForwardIcon color="currentColor" size={22} />
          )}
        </Icon>
        {action.name}
        {action.children?.length ? "…" : ""}
      </Flex>
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

const Item = styled.div`
  font-size: 15px;
  padding: 12px 16px;
  background: ${(props) =>
    props.active ? props.theme.menuItemSelected : "none"};
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
`;

const ForwardIcon = styled(BackIcon)`
  transform: rotate(180deg);
`;
