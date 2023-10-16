import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

const RealTextarea = styled.textarea<{ hasIcon?: boolean }>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px ${(props) => (props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${s("text")};

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const RealInput = styled.input<{ hasIcon?: boolean }>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px ${(props) => (props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${s("text")};
  height: 30px;
  min-width: 0;
  font-size: 15px;

  ${ellipsis()}
  ${undraggableOnDesktop()}

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px ${s("background")} inset;
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
  minWidth?: number;
  maxHeight?: number;
}>`
  flex: ${(props) => (props.flex ? "1" : "0")};
  width: ${(props) => (props.short ? "49%" : "auto")};
  max-width: ${(props) => (props.short ? "350px" : "100%")};
  min-width: ${({ minWidth }) => (minWidth ? `${minWidth}px` : "initial")};
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
  background: ${s("background")};

  /* Prevents an issue where input placeholder appears in a selected style when double clicking title bar */
  user-select: none;
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
  error?: string;
  icon?: React.ReactNode;
  /** Like autoFocus, but also select any text in the input */
  autoSelect?: boolean;
  /** Callback is triggered with the CMD+Enter keyboard combo */
  onRequestSubmit?: (
    ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => unknown;
  onFocus?: (ev: React.SyntheticEvent) => unknown;
  onBlur?: (ev: React.SyntheticEvent) => unknown;
};

function Input(
  props: Props,
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) {
  const internalRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>();
  const [focused, setFocused] = React.useState(false);

  const handleBlur = (ev: React.SyntheticEvent) => {
    setFocused(false);

    if (props.onBlur) {
      props.onBlur(ev);
    }
  };

  const handleFocus = (ev: React.SyntheticEvent) => {
    setFocused(true);

    if (props.onFocus) {
      props.onFocus(ev);
    }
  };

  const handleKeyDown = (
    ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (ev.key === "Enter" && ev.metaKey) {
      if (props.onRequestSubmit) {
        props.onRequestSubmit(ev);
      }
    }

    if (props.onKeyDown) {
      props.onKeyDown(ev);
    }
  };

  React.useEffect(() => {
    if (props.autoSelect && internalRef.current) {
      internalRef.current.select();
    }
  }, [props.autoSelect, internalRef]);

  const {
    type = "text",
    icon,
    label,
    margin,
    error,
    className,
    short,
    flex,
    labelHidden,
    onFocus,
    onBlur,
    onRequestSubmit,
    children,
    ...rest
  } = props;

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
        <Outline focused={focused} margin={margin}>
          {icon && <IconWrapper>{icon}</IconWrapper>}
          {type === "textarea" ? (
            <RealTextarea
              ref={mergeRefs([
                internalRef,
                ref as React.RefObject<HTMLTextAreaElement>,
              ])}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              hasIcon={!!icon}
              {...rest}
            />
          ) : (
            <RealInput
              ref={mergeRefs([
                internalRef,
                ref as React.RefObject<HTMLInputElement>,
              ])}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              hasIcon={!!icon}
              type={type}
              {...rest}
            />
          )}
          {children}
        </Outline>
      </label>
      {error && (
        <TextWrapper>
          <StyledText type="danger" size="xsmall">
            {error}
          </StyledText>
        </TextWrapper>
      )}
    </Wrapper>
  );
}

export const TextWrapper = styled.span`
  min-height: 16px;
  display: block;
  margin-top: -16px;
`;

export const StyledText = styled(Text)`
  margin-bottom: 0;
`;

export default React.forwardRef(Input);
