// @flow
import * as React from 'react';
import styled from 'styled-components';
import Flex from 'shared/components/Flex';

const RealTextarea = styled.textarea`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;

  &:disabled,
  &::placeholder {
    color: ${props => props.theme.slate};
  }
`;

const RealInput = styled.input`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;

  &:disabled,
  &::placeholder {
    color: ${props => props.theme.slate};
  }
`;

const Wrapper = styled.div`
  max-width: ${props => (props.short ? '350px' : '100%')};
`;

export const Outline = styled(Flex)`
  display: flex;
  flex: 1;
  margin: 0 0 16px;
  color: inherit;
  border-width: 1px;
  border-style: solid;
  border-color: ${props => (props.hasError ? 'red' : props.theme.slateLight)};
  border-radius: 4px;
  font-weight: normal;

  &:focus {
    border-color: ${props => props.theme.slate};
  }
`;

export const LabelText = styled.div`
  font-weight: 500;
  padding-bottom: 4px;
`;

export type Props = {
  type?: string,
  value?: string,
  label?: string,
  className?: string,
  short?: boolean,
};

export default function Input({
  type = 'text',
  label,
  className,
  short,
  ...rest
}: Props) {
  const InputComponent = type === 'textarea' ? RealTextarea : RealInput;

  return (
    <Wrapper className={className} short={short}>
      <label>
        {label && <LabelText>{label}</LabelText>}
        <Outline>
          <InputComponent {...rest} />
        </Outline>
      </label>
    </Wrapper>
  );
}
