// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';
import { darken } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${props => {
                if (props.nude) return 'transparent';
                return props.primary ? color.primary : color.slateLight;
              }};
  color: ${props => (props.primary ? color.white : color.slateDark)};
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
    background: ${props => {
                  if (props.nude) return color.slateLight;
                  return darken(0.05, props.primary ? color.primary : color.slateLight);
                }};
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
  line-height: 24px;
  justify-content: center;
`;

export type Props = {
  type?: string,
  value?: string,
  primary?: boolean,
  nude?: boolean,
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
