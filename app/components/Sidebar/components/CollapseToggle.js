// @flow
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
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              fill="currentColor"
              d="M7 0C6.44772 0 6 0.447716 6 1V6H1C0.447716 6 0 6.44772 0 7C0 7.55228 0.447716 8 1 8H6V13C6 13.5523 6.44772 14 7 14C7.55228 14 8 13.5523 8 13V8H13C13.5523 8 14 7.55228 14 7C14 6.44772 13.5523 6 13 6H8V1C8 0.447715 7.55228 0 7 0Z"
            />
          </svg>
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              d="M13 6C13.5523 6 14 6.44772 14 7C14 7.55228 13.5523 8 13 8H1C0.447716 8 0 7.55228 0 7C0 6.44772 0.447716 6 1 6H13Z"
            />
          </svg>
        )}
      </Button>
    </Tooltip>
  );
}

export const Button = styled.button`
  display: block;
  position: absolute;
  top: 8px;
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
  padding: 4px;

  &:hover {
    color: ${(props) => props.theme.white};
    background: ${(props) => props.theme.primary};
  }
`;

export default CollapseToggle;
