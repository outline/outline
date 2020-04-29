// @flow
import * as React from 'react';
import styled from 'styled-components';
import { darken, lighten } from 'polished';
import { ExpandedIcon } from 'outline-icons';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${props => props.theme.buttonBackground};
  color: ${props => props.theme.buttonText};
  box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  height: 32px;
  text-decoration: none;
  flex-shrink: 0;
  outline: none;
  cursor: pointer;
  user-select: none;

  svg {
    fill: ${props => props.iconColor || props.theme.buttonText};
  }

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover {
    background: ${props => darken(0.05, props.theme.buttonBackground)};
  }

  &:focus {
    transition-duration: 0.05s;
    box-shadow: ${props => lighten(0.4, props.theme.buttonBackground)} 0px 0px
      0px 3px;
    outline: none;
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${props => props.theme.white50};
  }

  ${props =>
    props.neutral &&
    `
    background: ${props.theme.buttonNeutralBackground};
    color: ${props.theme.buttonNeutralText};
    box-shadow: ${
      props.borderOnHover ? 'none' : 'rgba(0, 0, 0, 0.07) 0px 1px 2px'
    };
    border: 1px solid ${
      props.borderOnHover ? 'transparent' : props.theme.buttonNeutralBorder
    };

    svg {
      fill: ${props.iconColor || props.theme.buttonNeutralText};
    }

    &:hover {
      background: ${darken(0.05, props.theme.buttonNeutralBackground)};
      border: 1px solid ${props.theme.buttonNeutralBorder};
    }

    &:focus {
      transition-duration: 0.05s;
      border: 1px solid ${lighten(0.4, props.theme.buttonBackground)};
      box-shadow: ${lighten(0.4, props.theme.buttonBackground)} 0px 0px
        0px 2px;
    }

    &:disabled {
      color: ${props.theme.textTertiary};
    }
  `} ${props =>
      props.danger &&
      `
      background: ${props.theme.danger};
      color: ${props.theme.white};

    &:hover {
      background: ${darken(0.05, props.theme.danger)};
    }

    &:focus {
      transition-duration: 0.05s;
      box-shadow: ${lighten(0.4, props.theme.danger)} 0px 0px
        0px 3px;
    }
  `};
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${props => props.hasIcon && 'padding-left: 4px;'};
`;

export const Inner = styled.span`
  display: flex;
  padding: 0 8px;
  padding-right: ${props => (props.disclosure ? 2 : 8)}px;
  line-height: ${props => (props.hasIcon ? 24 : 32)}px;
  justify-content: center;
  align-items: center;

  ${props => props.hasIcon && props.hasText && 'padding-left: 4px;'};
  ${props => props.hasIcon && !props.hasText && 'padding: 0 4px;'};
`;

export type Props = {
  type?: string,
  value?: string,
  icon?: React.Node,
  iconColor?: string,
  className?: string,
  children?: React.Node,
  innerRef?: React.ElementRef<any>,
  disclosure?: boolean,
  borderOnHover?: boolean,
};

function Button({
  type = 'text',
  icon,
  children,
  value,
  disclosure,
  innerRef,
  ...rest
}: Props) {
  const hasText = children !== undefined || value !== undefined;
  const hasIcon = icon !== undefined;

  return (
    <RealButton type={type} ref={innerRef} {...rest}>
      <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
        {hasIcon && icon}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
        {disclosure && <ExpandedIcon />}
      </Inner>
    </RealButton>
  );
}

// $FlowFixMe - need to upgrade to get forwardRef
export default React.forwardRef((props, ref) => (
  <Button {...props} innerRef={ref} />
));
