// @flow
import { NextIcon, BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Tooltip from "components/Tooltip";
import { meta } from "utils/keyboard";

type Props = {|
  collapsed: boolean,
  onClick?: () => void,
|};

function CollapseToggle({ collapsed, ...rest }: Props) {
  const { t } = useTranslation();

  return (
    <Tooltip
      tooltip={collapsed ? t("Expand") : t("Collapse")}
      shortcut={`${meta}+.`}
      delay={500}
      placement="bottom"
    >
      <Button {...rest} aria-hidden>
        {collapsed ? (
          <NextIcon color="currentColor" />
        ) : (
          <BackIcon color="currentColor" />
        )}
      </Button>
    </Tooltip>
  );
}

export const Button = styled.button`
  display: block;
  position: absolute;
  top: 28px;
  right: 8px;
  border: 0;
  width: 24px;
  height: 24px;
  z-index: 1;
  font-weight: 600;
  color: ${(props) => props.theme.sidebarText};
  background: ${(props) => props.theme.sidebarItemBackground};
  transition: opacity 100ms ease-in-out;
  border-radius: 4px;
  opacity: 0;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${(props) => props.theme.white};
    background: ${(props) => props.theme.primary};
  }
`;

export default CollapseToggle;
