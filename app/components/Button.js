// @flow
import { ExpandedIcon } from "outline-icons";
import { darken } from "polished";
import * as React from "react";
import styled from "styled-components";

const RealButton = styled.button`
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

  ${(props) =>
    !props.borderOnHover &&
    `
      svg {
        fill: ${props.iconColor || props.theme.buttonText};
      }
    `}

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover {
    background: ${(props) => darken(0.05, props.theme.buttonBackground)};
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${(props) => props.theme.white50};
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
      fill: ${props.iconColor || props.theme.buttonNeutralText};
    }`
    }
    

    &:hover {
      background: ${darken(0.05, props.theme.buttonNeutralBackground)};
      box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${
        props.theme.buttonNeutralBorder
      } 0 0 0 1px inset;
    }

    &:disabled {
      color: ${props.theme.textTertiary};
    }
  `} ${(props) =>
    props.danger &&
    `
      background: ${props.theme.danger};
      color: ${props.theme.white};

      &:hover {
        background: ${darken(0.05, props.theme.danger)};
      }
  `};
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${(props) => props.hasIcon && "padding-left: 4px;"};
`;

export const Inner = styled.span`
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

export type Props = {|
  type?: "button" | "submit",
  value?: string,
  icon?: React.Node,
  iconColor?: string,
  className?: string,
  children?: React.Node,
  innerRef?: React.ElementRef<any>,
  disclosure?: boolean,
  neutral?: boolean,
  danger?: boolean,
  primary?: boolean,
  disabled?: boolean,
  fullwidth?: boolean,
  autoFocus?: boolean,
  style?: Object,
  as?: React.ComponentType<any>,
  to?: string,
  onClick?: (event: SyntheticEvent<>) => mixed,
  borderOnHover?: boolean,

  "data-on"?: string,
  "data-event-category"?: string,
  "data-event-action"?: string,
|};

const Button = React.forwardRef<Props, HTMLButtonElement>(
  (
    {
      type = "text",
      icon,
      children,
      value,
      disclosure,
      neutral,
      ...rest
    }: Props,
    innerRef
  ) => {
    const hasText = children !== undefined || value !== undefined;
    const hasIcon = icon !== undefined;

    return (
      <RealButton type={type} ref={innerRef} $neutral={neutral} {...rest}>
        <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
          {hasIcon && icon}
          {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
          {disclosure && <ExpandedIcon />}
        </Inner>
      </RealButton>
    );
  }
);

export default Button;
