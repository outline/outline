import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";

type Props = {
  onClick?: React.MouseEventHandler;
  expanded?: boolean;
};

export const Header: React.FC<Props> = ({ onClick, expanded, children }) => {
  return (
    <H3>
      <Button onClick={onClick} disabled={!onClick}>
        {children}
        {onClick && (
          <Disclosure expanded={expanded} color="currentColor" size={20} />
        )}
      </Button>
    </H3>
  );
};

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  color: ${(props) => props.theme.textTertiary};
  letter-spacing: 0.03em;
  margin: 0;
  padding: 4px 2px 4px 12px;
  height: 22px;
  border: 0;
  background: none;
  border-radius: 4px;
  -webkit-appearance: none;
  transition: all 100ms ease;

  &:not(:disabled):hover,
  &:not(:disabled):active {
    color: ${(props) => props.theme.textSecondary};
    cursor: pointer;
  }
`;

const Disclosure = styled(CollapsedIcon)<{ expanded?: boolean }>`
  transition: opacity 100ms ease, transform 100ms ease, fill 50ms !important;
  ${({ expanded }) => !expanded && "transform: rotate(-90deg);"};
  opacity: 0;
`;

const H3 = styled.h3`
  margin: 0;

  &:hover {
    ${Disclosure} {
      opacity: 1;
    }
  }
`;

export default Header;
