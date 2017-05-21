// @flow
import React from 'react';
import styled from 'styled-components';

const RealButton = styled.button`
  display: inline-block;
  margin: 0;
  padding: 0;
  border: 0;
  background: #13CF9F;
  color: #FFF;
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
  className?: string,
  children?: React$Element<any>,
};

export default function Button({ type = 'text', children, ...rest }: Props) {
  const hasText = children !== undefined;

  return (
    <RealButton {...rest}>
      <Inner>
        {hasText && <Label>{children}</Label>}
      </Inner>
    </RealButton>
  );
}
