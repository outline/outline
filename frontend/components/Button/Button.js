// @flow
import React from 'react';
import styled from 'styled-components';
import { size, color } from 'styles/constants';
import { darken } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0 0 ${size.large};
  padding: 0;
  border: 0;
  background: ${color.primary};
  color: ${color.white};
  border-radius: 4px;
  min-width: 32px;
  min-height: 32px;
  text-decoration: none;
  flex-shrink: 0;
  outline: none;

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }
  &:hover {
    background: ${darken(0.05, color.primary)};
  }
`;

const Label = styled.span`
  padding: 2px 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Inner = styled.span`
  display: flex;
  line-height: 28px;
  justify-content: center;
`;

export type Props = {
  type?: string,
  value?: string,
  icon?: React$Element<any>,
  className?: string,
  children?: React$Element<any>,
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
      <Inner>
        {hasIcon && icon}
        {hasText && <Label>{children || value}</Label>}
      </Inner>
    </RealButton>
  );
}
