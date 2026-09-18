import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import { ActionSeparator, createRootMenuAction } from "~/actions";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import NudeButton from "~/components/NudeButton";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";
import type { ActionVariant } from "~/types";
import { SidebarSectionContext } from "./DraggableSection";

type Props = {
  /** Unique header id – if passed the header will become toggleable */
  id?: string;
  title: React.ReactNode;
  /** Actions shown at the top of the header's context menu */
  actions?: ActionVariant[];
  children?: React.ReactNode;
};

export function getHeaderExpandedKey(id: string) {
  return `sidebar-header-${id}`;
}

/**
 * Toggleable sidebar header
 */
export const Header: React.FC<Props> = ({
  id,
  title,
  actions,
  children,
}: Props) => {
  const { t } = useTranslation();
  const [firstRender, setFirstRender] = React.useState(true);
  const sectionContext = React.useContext(SidebarSectionContext);
  const sectionActions = sectionContext?.menuActions;
  const hasMenu = !!(actions?.length || sectionActions?.length);

  // Dangling separators are trimmed when the menu items are rendered.
  const menuAction = React.useMemo(
    () =>
      createRootMenuAction([
        ...(actions ?? []),
        ActionSeparator,
        ...(sectionActions ?? []),
      ]),
    [actions, sectionActions]
  );
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
      <ContextMenu
        action={hasMenu ? menuAction : undefined}
        ariaLabel={t("Section options")}
      >
        <H3 ref={sectionContext?.dragRef}>
          <Button onClick={handleClick} disabled={!id}>
            {title}
            {id && <Disclosure $expanded={expanded} size={20} />}
          </Button>
          {hasMenu && (
            <Actions>
              <DropdownMenu
                action={menuAction}
                align="end"
                ariaLabel={t("Section options")}
              >
                <OverflowMenuButton />
              </DropdownMenu>
            </Actions>
          )}
        </H3>
      </ContextMenu>
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
  padding-inline: 12px 32px;
  border: 0;
  background: none;
  border-radius: 4px;
  -webkit-appearance: none;
  transition: all 100ms ease;
  ${undraggableOnDesktop()}

  &:not(:disabled) {
    cursor: var(--pointer);
  }
`;

const Actions = styled.span`
  display: inline-flex;
  visibility: hidden;
  position: absolute;
  top: 2px;
  inset-inline-end: 4px;
  height: 24px;

  [data-drag-active] & {
    display: none;
  }

  svg {
    color: ${s("textSecondary")};
    fill: currentColor;
    opacity: 0.5;
  }

  ${NudeButton} {
    background: transparent;

    &:hover,
    &[aria-expanded="true"] {
      background: ${s("sidebarControlHoverBackground")};

      svg {
        opacity: 0.75;
      }
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
  position: relative;
  margin: 0;

  /* The context menu marks the header itself, the dropdown marks its button. */
  &:hover,
  &:focus-within,
  &[data-state="open"],
  &:has([data-state="open"]) {
    ${Disclosure} {
      opacity: 1;
    }

    ${Actions} {
      visibility: visible;
    }
  }

  /* Hovering the actions must keep the header highlighted, so the hover
     background is applied from the heading rather than the button. */
  &:hover,
  &:active,
  &[data-state="open"],
  &:has([data-state="open"]) {
    ${Button}:not(:disabled) {
      background: ${s("sidebarHoverBackground")};
    }
  }

  @media (hover: hover) {
    &:hover,
    &[data-state="open"],
    &:has([data-state="open"]) {
      ${Button}:not(:disabled) {
        color: ${s("text")};
      }
    }
  }
`;

export default Header;
