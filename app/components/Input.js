// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import styled from 'styled-components';
import VisuallyHidden from 'components/VisuallyHidden';
import Flex from 'shared/components/Flex';

const RealTextarea = styled.textarea`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;
  color: ${props => props.theme.text};

  &:disabled,
  &::placeholder {
    color: ${props => props.theme.placeholder};
  }
`;

const RealInput = styled.input`
  border: 0;
  flex: 1;
  padding: 8px 12px;
  outline: none;
  background: none;
  color: ${props => props.theme.text};

  &:disabled,
  &::placeholder {
    color: ${props => props.theme.placeholder};
  }

  &::-webkit-search-cancel-button {
    -webkit-appearance: searchfield-cancel-button;
  }
`;

const Wrapper = styled.div`
  flex: ${props => (props.flex ? '1' : '0')};
  max-width: ${props => (props.short ? '350px' : '100%')};
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : '0')};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : 'initial')};
`;

export const Outline = styled(Flex)`
  display: flex;
  flex: 1;
  margin: 0 0 16px;
  color: inherit;
  border-width: 1px;
  border-style: solid;
  border-color: ${props =>
    props.hasError
      ? 'red'
      : props.focused
        ? props.theme.inputBorderFocused
        : props.theme.inputBorder};
  border-radius: 4px;
  font-weight: normal;
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
  labelHidden?: boolean,
  flex?: boolean,
  short?: boolean,
};

@observer
class Input extends React.Component<Props> {
  @observable focused: boolean = false;

  handleBlur = () => {
    this.focused = false;
  };

  handleFocus = () => {
    this.focused = true;
  };

  render() {
    const {
      type = 'text',
      label,
      className,
      short,
      flex,
      labelHidden,
      ...rest
    } = this.props;

    const InputComponent = type === 'textarea' ? RealTextarea : RealInput;
    const wrappedLabel = <LabelText>{label}</LabelText>;

    return (
      <Wrapper className={className} short={short} flex={flex}>
        <label>
          {label &&
            (labelHidden ? (
              <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
            ) : (
              wrappedLabel
            ))}
          <Outline focused={this.focused}>
            <InputComponent
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
              type={type === 'textarea' ? undefined : type}
              {...rest}
            />
          </Outline>
        </label>
      </Wrapper>
    );
  }
}

export default Input;
