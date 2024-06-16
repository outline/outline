import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { Hook, PluginManager } from "~/utils/PluginManager";

const icons = PluginManager.getHooks(Hook.Icon);

type Props = {
  id: string;
  size?: number;
  color?: string;
};

/**
 * Renders an icon defined in a plugin (Hook.Icon).
 */
function PluginIcon({ id, color, size = 24 }: Props) {
  const plugin = icons.find((p) => p.id === id);
  const Icon = plugin?.value;

  if (Icon) {
    return (
      <Wrapper>
        <Icon size={size} fill={color} />
      </Wrapper>
    );
  }

  return null;
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
`;

export default observer(PluginIcon);
