// @flow
import React from 'react';
import styled from 'styled-components';
import { size, color } from 'styles/constants';
import { darken } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0 ${size.medium} ${size.large} 0;
  padding: 0;
  border: 0;
  background: ${props => (props.neutral ? color.slate : props.danger ? color.danger : color.primary)};
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
    background: ${props => darken(0.05, props.neutral ? color.slate : props.danger ? color.danger : color.primary)};
  }
  &:disabled {
    background: ${color.slateLight};
  }
`;

const Label = styled.span`
  padding: 4px 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: 500;
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
