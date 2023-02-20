import * as React from "react";
import styled from "styled-components";
import PluginLoader from "~/utils/PluginLoader";

type Props = {
  providerName: string;
  size?: number;
  color?: string;
};

function AuthLogo({ providerName, color, size = 24 }: Props) {
  const plugin = PluginLoader.plugins[providerName];
  const Icon = plugin?.icon;

  if (Icon) {
    return (
      <Logo>
        <Icon size={size} fill={color} />
      </Logo>
    );
  }

  return null;
}

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
`;

export default AuthLogo;
