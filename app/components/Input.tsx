import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Flex from "~/components/Flex";

const RealTextarea = styled.textarea<{ hasIcon?: boolean }>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px ${(props) => (props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${(props) => props.theme.text};

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const RealInput = styled.input<{ hasIcon?: boolean }>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px ${(props) => (props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${(props) => props.theme.text};
  height: 30px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:disabled,
  &::placeholder {
    color: ${(props) => props.theme.placeholder};
  }

  &::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  ${breakpoint("mobile", "tablet")`
    font-size: 16px;
  `};
`;

const Wrapper = styled.div<{
  flex?: boolean;
  short?: boolean;
  minHeight?: number;
  maxHeight?: number;
}>`
  flex: ${(props) => (props.flex ? "1" : "0")};
  width: ${(props) => (props.short ? "49%" : "auto")};
  max-width: ${(props) => (props.short ? "350px" : "100%")};
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : "0")};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : "initial")};
`;

const IconWrapper = styled.span`
  position: relative;
  left: 4px;
  width: 24px;
  height: 24px;
`;

export const Outline = styled(Flex)<{
  margin?: string | number;
  hasError?: boolean;
  focused?: boolean;
}>`
  flex: 1;
  margin: ${(props) =>
    props.margin !== undefined ? props.margin : "0 0 16px"};
  color: inherit;
  border-width: 1px;
  border-style: solid;
  border-color: ${(props) =>
    props.hasError
      ? props.theme.danger
      : props.focused
      ? props.theme.inputBorderFocused
      : props.theme.inputBorder};
  border-radius: 4px;
  font-weight: normal;
  align-items: center;
  overflow: hidden;
  background: ${(props) => props.theme.background};
`;

export const LabelText = styled.div`
  font-weight: 500;
  padding-bottom: 4px;
  display: inline-block;
`;

export type Props = React.HTMLAttributes<HTMLInputElement> & {
  type?: "text" | "email" | "checkbox" | "search" | "textarea";
  value?: string;
  label?: string;
  className?: string;
  labelHidden?: boolean;
  flex?: boolean;
  short?: boolean;
  margin?: string | number;
  icon?: React.ReactNode;
  name?: string;
  minLength?: number;
  maxLength?: number;
  autoFocus?: boolean;
  autoComplete?: boolean | string;
  readOnly?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => unknown;
  innerRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  onKeyDown?: (ev: React.KeyboardEvent<HTMLInputElement>) => unknown;
  onFocus?: (ev: React.SyntheticEvent) => unknown;
  onBlur?: (ev: React.SyntheticEvent) => unknown;
};

@observer
class Input extends React.Component<Props> {
  input = this.props.innerRef;

  @observable
  focused = false;

  handleBlur = (ev: React.SyntheticEvent) => {
    this.focused = false;

    if (this.props.onBlur) {
      this.props.onBlur(ev);
    }
  };

  handleFocus = (ev: React.SyntheticEvent) => {
    this.focused = true;

    if (this.props.onFocus) {
      this.props.onFocus(ev);
    }
  };

  render() {
    const {
      type = "text",
      icon,
      label,
      margin,
      className,
      short,
      flex,
      labelHidden,
      onFocus,
      onBlur,
      ...rest
    } = this.props;

    const InputComponent: React.ComponentType =
      type === "textarea" ? RealTextarea : RealInput;
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
          <Outline focused={this.focused} margin={margin}>
            {icon && <IconWrapper>{icon}</IconWrapper>}
            <InputComponent
              // @ts-expect-error no idea why this is not working
              ref={this.input}
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
              hasIcon={!!icon}
              type={type === "textarea" ? undefined : type}
              {...rest}
            />
          </Outline>
        </label>
      </Wrapper>
    );
  }
}

export default Input;
