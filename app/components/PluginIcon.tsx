import * as React from "react";
import styled from "styled-components";
import PluginLoader from "~/utils/PluginLoader";

type Props = {
  id: string;
  size?: number;
  color?: string;
};

function PluginIcon({ id, color, size = 24 }: Props) {
  const plugin = PluginLoader.plugins[id];
  const Icon = plugin?.icon;

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

export default PluginIcon;
