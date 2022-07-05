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

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px ${(props) => props.theme.background}
      inset;
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

export type Props = React.InputHTMLAttributes<
  HTMLInputElement | HTMLTextAreaElement
> & {
  type?: "text" | "email" | "checkbox" | "search" | "textarea";
  labelHidden?: boolean;
  label?: string;
  flex?: boolean;
  short?: boolean;
  margin?: string | number;
  icon?: React.ReactNode;
  innerRef?: React.Ref<any>;
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
            {type === "textarea" ? (
              <RealTextarea
                ref={this.props.innerRef}
                onBlur={this.props.onBlur}
                onFocus={this.handleFocus}
                hasIcon={!!icon}
                {...rest}
              />
            ) : (
              <RealInput
                ref={this.props.innerRef}
                onBlur={this.props.onBlur}
                onFocus={this.handleFocus}
                hasIcon={!!icon}
                type={type}
                {...rest}
              />
            )}
          </Outline>
        </label>
      </Wrapper>
    );
  }
}

export const ReactHookWrappedInput = React.forwardRef(
  (props: Omit<Props, "innerRef">, ref: React.Ref<any>) => {
    return <Input {...{ ...props, innerRef: ref }} />;
  }
);

export default Input;
