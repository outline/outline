import { LocationDescriptor } from "history";
import { ExpandedIcon } from "outline-icons";
import { darken, lighten } from "polished";
import * as React from "react";
import styled from "styled-components";

const RealButton = styled.button<{
  fullwidth?: boolean;
  borderOnHover?: boolean;
  $neutral?: boolean;
  danger?: boolean;
  iconColor?: string;
}>`
  display: ${(props) => (props.fullwidth ? "block" : "inline-block")};
  width: ${(props) => (props.fullwidth ? "100%" : "auto")};
  margin: 0;
  padding: 0;
  border: 0;
  background: ${(props) => props.theme.buttonBackground};
  color: ${(props) => props.theme.buttonText};
  box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  height: 32px;
  text-decoration: none;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
  appearance: none !important;

  ${(props) =>
    !props.borderOnHover &&
    `
      svg {
        fill: ${props.iconColor || "currentColor"};
      }
    `}

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover:not(:disabled),
  &[aria-expanded="true"] {
    background: ${(props) => darken(0.05, props.theme.buttonBackground)};
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${(props) => props.theme.white50};
    background: ${(props) => lighten(0.2, props.theme.buttonBackground)};

    svg {
      fill: ${(props) => props.theme.white50};
    }
  }

  ${(props) =>
    props.$neutral &&
    `
    background: ${props.theme.buttonNeutralBackground};
    color: ${props.theme.buttonNeutralText};
    box-shadow: ${
      props.borderOnHover
        ? "none"
        : `rgba(0, 0, 0, 0.07) 0px 1px 2px, ${props.theme.buttonNeutralBorder} 0 0 0 1px inset`
    };

    ${
      props.borderOnHover
        ? ""
        : `svg {
      fill: ${props.iconColor || "currentColor"};
    }`
    }


    &:hover:not(:disabled),
    &[aria-expanded="true"] {
      background: ${
        props.borderOnHover
          ? props.theme.buttonNeutralBackground
          : darken(0.05, props.theme.buttonNeutralBackground)
      };
      box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${
        props.theme.buttonNeutralBorder
      } 0 0 0 1px inset;
    }

    &:disabled {
      color: ${props.theme.textTertiary};
      background: none;

      svg {
        fill: currentColor;
      }
    }
  `}

  ${(props) =>
    props.danger &&
    `
      background: ${props.theme.danger};
      color: ${props.theme.white};

      &:hover:not(:disabled),
      &[aria-expanded="true"] {
        background: ${darken(0.05, props.theme.danger)};
      }

      &:disabled {
        background: ${lighten(0.05, props.theme.danger)};
      }

      &.focus-visible {
        outline-color: ${darken(0.2, props.theme.danger)} !important;
      }
  `};
`;

const Label = styled.span<{ hasIcon?: boolean }>`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${(props) => props.hasIcon && "padding-left: 4px;"};
`;

export const Inner = styled.span<{
  disclosure?: boolean;
  hasIcon?: boolean;
  hasText?: boolean;
}>`
  display: flex;
  padding: 0 8px;
  padding-right: ${(props) => (props.disclosure ? 2 : 8)}px;
  line-height: ${(props) => (props.hasIcon ? 24 : 32)}px;
  justify-content: center;
  align-items: center;
  min-height: 32px;

  ${(props) => props.hasIcon && props.hasText && "padding-left: 4px;"};
  ${(props) => props.hasIcon && !props.hasText && "padding: 0 4px;"};
`;

export type Props<T> = {
  icon?: React.ReactNode;
  iconColor?: string;
  children?: React.ReactNode;
  disclosure?: boolean;
  neutral?: boolean;
  danger?: boolean;
  primary?: boolean;
  fullwidth?: boolean;
  as?: T;
  to?: LocationDescriptor;
  borderOnHover?: boolean;
  href?: string;
  "data-on"?: string;
  "data-event-category"?: string;
  "data-event-action"?: string;
};

const Button = <T extends React.ElementType = "button">(
  props: Props<T> & React.ComponentPropsWithoutRef<T>,
  ref: React.Ref<HTMLButtonElement>
) => {
  const { type, icon, children, value, disclosure, neutral, ...rest } = props;
  const hasText = children !== undefined || value !== undefined;
  const hasIcon = icon !== undefined;

  return (
    <RealButton type={type || "button"} ref={ref} $neutral={neutral} {...rest}>
      <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
        {hasIcon && icon}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
        {disclosure && <ExpandedIcon color="currentColor" />}
      </Inner>
    </RealButton>
  );
};

export default React.forwardRef(Button);
