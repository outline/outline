// @flow
import React from 'react';
import styled from 'styled-components';
import Flex from 'components/Flex';
import { size } from 'styles/constants';

const RealTextarea = styled.textarea`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
`;

const RealInput = styled.input`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
`;

const Wrapper = styled(Flex)`
  display: flex;
  flex: 1;
  margin: 0 0 ${size.large};
  color: inherit;
  border-width: 2px;
  border-style: solid;
  border-color: ${props => (props.hasError ? 'red' : 'rgba(0, 0, 0, .15)')};
  border-radius: ${size.small};

  &:focus,
  &:active {
    border-color: rgba(0, 0, 0, .25);
  }
`;

export type Props = {
  type: string,
  value: string,
  className?: string,
};

export default function Input({ type, ...rest }: Props) {
  const Component = type === 'textarea' ? RealTextarea : RealInput;

  return (
    <Wrapper>
      <Component {...rest} />
    </Wrapper>
  );
}
