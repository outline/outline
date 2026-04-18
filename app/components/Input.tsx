import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import Fade from "~/components/Fade";
import { undraggableOnDesktop } from "~/styles";

export const NativeTextarea = styled.textarea<{
  hasIcon?: boolean;
  hasPrefix?: boolean;
  $autoSize?: boolean;
  $minHeight?: string;
  $maxHeight?: string;
}>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px
    ${(props) => (props.hasPrefix ? 0 : props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${s("text")};

  ${(props) => props.$autoSize && `field-sizing: content;`}
  ${(props) => props.$minHeight && `min-height: ${props.$minHeight};`}
  ${(props) => props.$maxHeight && `max-height: ${props.$maxHeight};`}

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
    opacity: 1;
  }
`;

export const NativeInput = styled.input<{
  hasIcon?: boolean;
  hasPrefix?: boolean;
}>`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px
    ${(props) => (props.hasPrefix ? 0 : props.hasIcon ? "8px" : "12px")};
  outline: none;
  background: none;
  color: ${s("text")};
  height: 30px;
  min-width: 0;
  font-size: 15px;

  ${ellipsis()}
  ${undraggableOnDesktop()}

  &[readOnly] {
    color: ${s("textSecondary")};
  }

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
    opacity: 1;
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

export const Wrapper = styled.div<{
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
  $focused?: boolean;
  $round?: boolean;
}>`
  position: relative;
  flex: 1;
  margin: ${(props) =>
    props.margin !== undefined ? props.margin : "0 0 16px"};
  color: inherit;
  border-width: 1px;
  border-style: solid;
  border-color: ${(props) =>
    props.hasError
      ? props.theme.danger
      : props.$focused
        ? props.theme.inputBorderFocused
        : props.theme.inputBorder};
  border-radius: ${(props) => (props.$round ? "16px" : "4px")};
  font-weight: normal;
  align-items: center;
  overflow: hidden;
  background: ${s("background")};

  /* Prevents an issue where input placeholder appears in a selected style when double clicking title bar */
  user-select: none;
`;

const CharacterCount = styled.span<{ $warning?: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  font-size: 11px;
  line-height: 1;
  padding: 2px 4px;
  border-radius: 0 0 0 2px;
  background: ${(props) =>
    props.$warning ? props.theme.warning : props.theme.inputBorder};
  color: ${(props) =>
    props.$warning ? props.theme.white : props.theme.textTertiary};
  pointer-events: none;
`;

export const LabelText = styled.div`
  font-weight: 500;
  padding-bottom: 4px;
  display: inline-block;
`;

export interface Props extends Omit<
  React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement>,
  "prefix"
> {
  type?: "text" | "email" | "checkbox" | "search" | "textarea" | "password";
  labelHidden?: boolean;
  label?: string;
  flex?: boolean;
  short?: boolean;
  margin?: string | number;
  error?: string;
  rows?: number;
  /** Optional component that appears inside the input before the textarea and any icon */
  prefix?: React.ReactNode;
  /** Optional icon that appears inside the input before the textarea */
  icon?: React.ReactNode;
  /** Show a character count near the maxLength limit. Always shown for textareas, opt-in for other types. */
  showCharacterCount?: boolean;
  /** An optional soft limit below maxLength. When the value exceeds this, the character count is shown in a warning color. */
  warningLimit?: number;
  /** For textareas, grow the height to fit content. Use with `maxHeight` to cap the growth. */
  autoSize?: boolean;
  /** Minimum height of the textarea as a CSS length value (e.g. "3lh", "80px"). */
  minHeight?: string;
  /** Maximum height of the textarea as a CSS length value (e.g. "20lh", "400px"). */
  maxHeight?: string;
  /** Whether to use a round border-radius (16px) instead of the default (4px). */
  round?: boolean;
  /** Like autoFocus, but also select any text in the input */
  autoSelect?: boolean;
  /** Callback is triggered with the CMD+Enter keyboard combo */
  onRequestSubmit?: (
    ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => unknown;
  onFocus?: (ev: React.SyntheticEvent) => unknown;
  onBlur?: (ev: React.SyntheticEvent) => unknown;
}

function Input(
  props: Props,
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) {
  const internalRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>();
  const [focused, setFocused] = React.useState(false);
  const [charCount, setCharCount] = React.useState(() => {
    if (typeof props.value === "string") {
      return props.value.length;
    }
    if (typeof props.defaultValue === "string") {
      return props.defaultValue.length;
    }
    return 0;
  });

  React.useEffect(() => {
    if (typeof props.value === "string") {
      setCharCount(props.value.length);
    }
  }, [props.value]);

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

  const handleChange = (
    ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setCharCount(ev.target.value.length);
    if (props.onChange) {
      props.onChange(ev);
    }
  };

  const handleKeyDown = (
    ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (ev.key === "Enter" && ev.metaKey) {
      if (props.onRequestSubmit) {
        props.onRequestSubmit(ev);
        return;
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
    prefix,
    round,
    labelHidden,
    maxLength,
    showCharacterCount,
    warningLimit,
    autoSize,
    minHeight,
    maxHeight,
    onFocus,
    onBlur,
    onChange,
    onRequestSubmit,
    children,
    ...rest
  } = props;

  const showCharCount =
    (type === "textarea" || showCharacterCount) &&
    maxLength !== undefined &&
    (charCount >= maxLength * 0.9 ||
      (warningLimit !== undefined && charCount >= warningLimit));

  const overWarningLimit =
    warningLimit !== undefined && charCount > warningLimit;

  const wrappedLabel = <LabelText>{label}</LabelText>;

  return (
    <Wrapper className={className} short={short} flex={flex}>
      <label>
        {label &&
          (labelHidden ? (
            <VisuallyHidden.Root>{wrappedLabel}</VisuallyHidden.Root>
          ) : (
            wrappedLabel
          ))}
        <Outline $focused={focused} $round={round} margin={margin}>
          {prefix}
          {icon && <IconWrapper>{icon}</IconWrapper>}
          {type === "textarea" ? (
            <NativeTextarea
              ref={mergeRefs([
                internalRef,
                ref as React.RefObject<HTMLTextAreaElement>,
              ])}
              onBlur={handleBlur}
              onFocus={handleFocus}
              hasIcon={!!icon}
              hasPrefix={!!prefix}
              $autoSize={autoSize}
              $minHeight={minHeight}
              $maxHeight={maxHeight}
              {...rest}
              // set it after "rest" to override props from spread.
              maxLength={maxLength}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
            />
          ) : (
            <NativeInput
              ref={mergeRefs([
                internalRef,
                ref as React.RefObject<HTMLInputElement>,
              ])}
              onBlur={handleBlur}
              onFocus={handleFocus}
              hasIcon={!!icon}
              hasPrefix={!!prefix}
              type={type}
              {...rest}
              // set it after "rest" to override "onKeyDown" and "onChange" from prop.
              maxLength={maxLength}
              onKeyDown={handleKeyDown}
              onChange={handleChange}
            />
          )}
          {showCharCount && (
            <Fade>
              <CharacterCount $warning={overWarningLimit}>
                {charCount}/{maxLength}
              </CharacterCount>
            </Fade>
          )}
          {children}
        </Outline>
      </label>
      {error && (
        <TextWrapper>
          <Text type="danger" size="xsmall">
            {error}
          </Text>
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

export default React.forwardRef(Input);
