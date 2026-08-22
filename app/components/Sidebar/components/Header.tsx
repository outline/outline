import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";
import { SectionDragContext } from "./DraggableSection";

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
  const dragRef = React.useContext(SectionDragContext);
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
      <H3 ref={dragRef}>
        <Button onClick={handleClick} disabled={!id}>
          {title}
          {id && <Disclosure $expanded={expanded} size={20} />}
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
  display: flex;
  align-items: center;
  width: 100%;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  color: ${s("sidebarText")};
  position: relative;
  letter-spacing: 0.03em;
  margin: 0;
  padding-block: 4px;
  padding-inline: 12px 2px;
  border: 0;
  background: none;
  border-radius: 4px;
  -webkit-appearance: none;
  transition: all 100ms ease;
  ${undraggableOnDesktop()}

  &:not(:disabled):hover,
  &:not(:disabled):active {
    background: ${s("sidebarHoverBackground")};
    cursor: var(--pointer);
  }

  @media (hover: hover) {
    &:not(:disabled):hover {
      color: ${s("text")};
    }
  }
`;

const Disclosure = styled(CollapsedIcon)<{ $expanded?: boolean }>`
  transition:
    opacity 100ms ease,
    transform 100ms ease,
    fill 50ms !important;
  ${(props) => !props.$expanded && "transform: rotate(-90deg);"};
  opacity: 0;

  [dir="rtl"] & {
    ${(props) => !props.$expanded && "transform: rotate(90deg);"};
  }
`;

const H3 = styled.h3`
  margin: 0;

  &:hover,
  &:focus-within {
    ${Disclosure} {
      opacity: 1;
    }
  }
`;

export default Header;
