// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import { darken, lighten } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 4px 12px;
  border: 0;
  background: ${color.primary};
  color: ${color.white};
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
    background: ${darken(0.05, color.primary)};
  }

  svg {
    position: relative;
    top: .05em;
  }

  ${props => props.light && `
    color: ${color.text};
    background: ${lighten(0.08, color.slateLight)};

    &:hover {
      background: ${color.slateLight};
    }
  `}

  ${props => props.neutral && `
    background: ${color.slate};

    &:hover {
      background: ${darken(0.05, color.slate)};
    }
  `}

  ${props => props.danger && `
    background: ${color.danger};

    &:hover {
      background: ${darken(0.05, color.danger)};
    }
  `}

  &:disabled {
    background: ${color.slateLight};
  }
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${props => props.hasIcon && 'padding-left: 2px;'}
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
      {hasIcon && icon}
      {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
    </RealButton>
  );
}
