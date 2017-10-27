// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';
import { darken, lighten } from 'polished';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: ${color.primary};
  color: ${color.white};
  border-radius: 4px;
  font-size: 15px;
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

const Inner = styled.span`
  padding: 4px 16px;
  display: flex;
  line-height: 28px;
  justify-content: center;
  align-items: center;

  ${props => props.small && `
    padding: 1px 10px;
  `}

  ${props => props.hasIcon && (props.small ? 'padding-left: 6px;' : 'padding-left: 10px;')}
`;

export type Props = {
  type?: string,
  value?: string,
  small?: boolean,
  icon?: React$Element<any>,
  className?: string,
  children?: React$Element<any>,
};

export default function Button({
  type = 'text',
  icon,
  children,
  small,
  value,
  ...rest
}: Props) {
  const hasText = children !== undefined || value !== undefined;
  const hasIcon = icon !== undefined;

  return (
    <RealButton {...rest}>
      <Inner hasIcon={hasIcon} small={small}>
        {hasIcon && icon}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
      </Inner>
    </RealButton>
  );
}
