// @flow
import * as React from 'react';
import styled from 'styled-components';
import { darken } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${props => props.theme.primary};
  color: ${props => props.theme.white};
  border-radius: 4px;
  font-size: 15px;
  height: 36px;
  text-decoration: none;
  flex-shrink: 0;
  outline: none;
  cursor: pointer;

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }
  &:hover {
    background: ${props => darken(0.05, props.theme.primary)};
  }

  svg {
    position: relative;
    top: 0.05em;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }

  ${props =>
    props.light &&
    `
    color: ${props.theme.slate};
    background: transparent;
    border: 1px solid ${props.theme.slate};

    &:hover {
      background: transparent;
      color: ${props.theme.slateDark};
      border: 1px solid ${props.theme.slateDark};
    }
  `} ${props =>
      props.neutral &&
      `
    background: ${props.theme.slate};

    &:hover {
      background: ${darken(0.05, props.theme.slate)};
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

  ${props => props.hasIcon && 'padding-left: 2px;'};
`;

const Inner = styled.span`
  padding: 0 12px;
  display: flex;
  line-height: 28px;
  justify-content: center;
  align-items: center;

  ${props =>
    props.hasIcon &&
    (props.small ? 'padding-left: 6px;' : 'padding-left: 10px;')};
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
