// @flow
import * as React from 'react';
import styled from 'styled-components';
import { darken } from 'polished';
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
    fill: ${props => props.theme.buttonText};
  }

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover {
    background: ${props => darken(0.05, props.theme.buttonBackground)};
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
    box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px;
    border: 1px solid ${darken(0.1, props.theme.buttonNeutralBackground)};

    svg {
      fill: ${props.theme.buttonNeutralText};
    }

    &:hover {
      background: ${darken(0.05, props.theme.buttonNeutralBackground)};
      border: 1px solid ${darken(0.15, props.theme.buttonNeutralBackground)};
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
  `};
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${props => props.hasIcon && 'padding-left: 4px;'};
`;

const Inner = styled.span`
  display: flex;
  padding: 0 8px;
  padding-right: ${props => (props.disclosure ? 2 : 8)}px;
  line-height: ${props => (props.hasIcon ? 24 : 32)}px;
  justify-content: center;
  align-items: center;

  ${props => props.hasIcon && 'padding-left: 4px;'};
`;

export type Props = {
  type?: string,
  value?: string,
  icon?: React.Node,
  className?: string,
  children?: React.Node,
  disclosure?: boolean,
};

export default function Button({
  type = 'text',
  icon,
  children,
  value,
  disclosure,
  ...rest
}: Props) {
  const hasText = children !== undefined || value !== undefined;
  const hasIcon = icon !== undefined;

  return (
    <RealButton type={type} {...rest}>
      <Inner hasIcon={hasIcon} disclosure={disclosure}>
        {hasIcon && icon}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
        {disclosure && <ExpandedIcon />}
      </Inner>
    </RealButton>
  );
}
