// @flow
import React from 'react';
import styled from 'styled-components';
import Flex from 'components/Flex';
import { size, color } from 'styles/constants';

const RealTextarea = styled.textarea`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;

  &::placeholder {
    color: ${color.slate};
  }
`;

const RealInput = styled.input`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;

  &::placeholder {
    color: ${color.slate};
  }
`;

const Wrapper = styled.div`

`;

const Outline = styled(Flex)`
  display: flex;
  flex: 1;
  margin: 0 0 ${size.large};
  color: inherit;
  border-width: 1px;
  border-style: solid;
  border-color: ${props => (props.hasError ? 'red' : color.slateLight)};
  border-radius: 4px;
  font-weight: normal;

  &:focus {
    border-color: ${color.slate}
  }
`;

const LabelText = styled.div`
  font-weight: 500;
  padding-bottom: 4px;
`;

export type Props = {
  type: string,
  value?: string,
  label?: string,
  className?: string,
};

export default function Input({ type, label, ...rest }: Props) {
  const InputComponent = type === 'textarea' ? RealTextarea : RealInput;

  return (
    <Wrapper>
      <label>
        {label && <LabelText>{label}</LabelText>}
        <Outline>
          <InputComponent {...rest} />
        </Outline>
      </label>
    </Wrapper>
  );
}
