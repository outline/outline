import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import { Hook, PluginManager } from "~/utils/PluginManager";

type Props = {
  /** The ID of the plugin to render an Icon for. */
  id: string;
  /** The size of the icon. */
  size?: number;
  /** The color of the icon. */
  color?: string;
};

/**
 * Renders an icon defined in a plugin (Hook.Icon).
 */
function PluginIcon({ id, color, size = 24 }: Props) {
  const plugin = PluginManager.getHook(Hook.Icon, id);
  const Icon = plugin?.value;

  if (Icon) {
    return (
      <IconPosition>
        <Icon size={size} fill={color} />
      </IconPosition>
    );
  }

  return null;
}

const IconPosition = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
`;

export default observer(PluginIcon);
