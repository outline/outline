import { ExpandedIcon } from "outline-icons";
import { ellipsis } from "polished";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import { fadeAndScaleIn } from "~/styles/animations";

type BaseMenuItemProps = {
  disabled?: boolean;
  $active?: boolean;
  $dangerous?: boolean;
};

const BaseMenuItemCSS = css<BaseMenuItemProps>`
  position: relative;
  display: flex;
  justify-content: left;
  align-items: center;
  width: 100%;
  min-height: 32px;
  font-size: 16px;
  cursor: var(--pointer);
  user-select: none;
  white-space: nowrap;

  background: none;
  color: ${(props) =>
    props.disabled ? props.theme.textTertiary : props.theme.textSecondary};

  margin: 0;
  border: 0;
  border-radius: 4px;
  padding: 12px;

  ${(props) => props.disabled && "pointer-events: none;"}

  svg {
    flex-shrink: 0;
    opacity: ${(props) => (props.disabled ? ".5" : 1)};
  }

  &:focus-visible {
    outline: 0; // Disable default outline on Firefox
  }

  ${(props) =>
    props.$active &&
    !props.disabled &&
    `
    color: ${props.theme.accentText};
    background: ${props.$dangerous ? props.theme.danger : props.theme.accent};
    outline-color: ${
      props.$dangerous ? props.theme.danger : props.theme.accent
    };
    box-shadow: none;
    cursor: var(--pointer);

    svg:not([data-fixed-color]) {
      color: ${props.theme.accentText};
      fill: ${props.theme.accentText};
    }
  `}

  ${(props) =>
    !props.disabled &&
    `
      &[data-highlighted],
      &:focus-visible {
        color: ${props.theme.accentText};
        background: ${props.$dangerous ? props.theme.danger : props.theme.accent};
        outline-color: ${
          props.$dangerous ? props.theme.danger : props.theme.accent
        };
        box-shadow: none;
        cursor: var(--pointer);

        svg:not([data-fixed-color]) {
          color: ${props.theme.accentText};
          fill: ${props.theme.accentText};
        }
      }
  `}

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: 14px;
  `}
`;

type MenuButtonProps = BaseMenuItemProps & {
  $dangerous?: boolean;
};

export const MenuButton = styled.button<MenuButtonProps>`
  ${BaseMenuItemCSS}
`;

export const MenuInternalLink = styled(Link)`
  ${BaseMenuItemCSS}
`;

export const MenuExternalLink = styled.a`
  ${BaseMenuItemCSS}
`;

export const MenuSubTrigger = styled.div<BaseMenuItemProps>`
  ${BaseMenuItemCSS}
`;

export const MenuSeparator = styled.hr`
  margin: 6px 0;
`;

export const MenuLabel = styled.div`
  ${ellipsis()}
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const MenuHeader = styled.h3`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: ${s("sidebarText")};
  letter-spacing: 0.04em;
  margin: 1em 12px 0.5em;
`;

export const MenuDisclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  position: absolute;
  right: 8px;
  color: ${s("textTertiary")};
`;

export const MenuIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-right: 6px;
  margin-left: -4px;
  color: ${s("textSecondary")};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const SelectedIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-right: -6px;
  color: ${s("textSecondary")};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MenuContent = styled(Scrollable)<{
  maxHeightVar: string;
  transformOriginVar: string;
}>`
  z-index: ${depths.menu};
  min-width: 180px;
  max-width: 276px;
  min-height: 44px;
  max-height: ${({ maxHeightVar }) => `min(85vh, var(${maxHeightVar}))`};
  font-weight: normal;

  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 6px;
  padding: 6px;
  outline: none;

  transform-origin: ${({ transformOriginVar }) => `var(${transformOriginVar})`};

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }

  @media print {
    display: none;
  }
`;
