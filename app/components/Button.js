// @flow
import * as React from 'react';
import styled from 'styled-components';
import { darken, lighten } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${props => props.theme.blackLight};
  color: ${props => props.theme.white};
  box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  height: 36px;
  text-decoration: none;
  text-transform: uppercase;
  flex-shrink: 0;
  outline: none;
  cursor: pointer;
  user-select: none;

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover {
    background: ${props => darken(0.05, props.theme.blackLight)};
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${props => lighten(0.2, props.theme.blackLight)};
  }

  ${props =>
    props.neutral &&
    `
    background: ${props.theme.white};
    color: ${props.theme.text};
    box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px;
    border: 1px solid ${props.theme.slateLight};

    &:hover {
      background: ${darken(0.05, props.theme.white)};
      border: 1px solid ${darken(0.05, props.theme.slateLight)};
    }
  `} ${props =>
      props.danger &&
      `
    background: ${props.theme.danger};

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
  padding: 0 12px;
  display: flex;
  line-height: 28px;
  justify-content: center;
  align-items: center;

  ${props =>
    props.hasIcon &&
    (props.small ? 'padding-left: 6px;' : 'padding-left: 8px;')};
`;

export type Props = {
  type?: string,
  value?: string,
  icon?: React.Node,
  className?: string,
  children?: React.Node,
};

export default function Button({
  type = 'text',
  icon,
  children,
  value,
  ...rest
}: Props) {
  const hasText = children !== undefined || value !== undefined;
  const hasIcon = icon !== undefined;

  return (
    <RealButton {...rest}>
      <Inner hasIcon={hasIcon}>
        {hasIcon && icon}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
      </Inner>
    </RealButton>
  );
}
