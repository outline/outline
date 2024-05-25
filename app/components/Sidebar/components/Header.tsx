import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";

type Props = {
  /** Unique header id – if passed the header will become toggleable */
  id?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
};

export function getHeaderExpandedKey(id: string) {
  return `sidebar-header-${id}`;
}

/**
 * Toggleable sidebar header
 */
export const Header: React.FC<Props> = ({ id, title, children }: Props) => {
  const [firstRender, setFirstRender] = React.useState(true);
  const [expanded, setExpanded] = usePersistedState<boolean>(
    getHeaderExpandedKey(id ?? ""),
    true
  );

  React.useEffect(() => {
    if (!expanded) {
      setFirstRender(false);
    }
  }, [expanded]);

  const handleClick = React.useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  return (
    <>
      <H3>
        <Button onClick={handleClick} disabled={!id}>
          {title}
          {id && <Disclosure expanded={expanded} size={20} />}
        </Button>
      </H3>
      {expanded && (firstRender ? children : <Fade>{children}</Fade>)}
    </>
  );
};

export const fadeAndSlideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const Fade = styled.span`
  animation: ${fadeAndSlideDown} 100ms ease-in-out;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  color: ${s("textTertiary")};
  letter-spacing: 0.03em;
  margin: 0;
  padding: 4px 2px 4px 12px;
  height: 22px;
  border: 0;
  background: none;
  border-radius: 4px;
  -webkit-appearance: none;
  transition: all 100ms ease;
  ${undraggableOnDesktop()}

  &:not(:disabled):hover,
  &:not(:disabled):active {
    color: ${s("textSecondary")};
    cursor: var(--pointer);
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
