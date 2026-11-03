import * as RadixSwitch from "@radix-ui/react-switch";
import { darken } from "polished";
import * as React from "react";
import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { s } from "@shared/styles";
import { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

interface Props extends Omit<
  React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>,
  "checked" | "onCheckedChange" | "onChange"
> {
  /** Width of the switch. Defaults to 32. */
  width?: number;
  /** Height of the switch. Defaults to 18 */
  height?: number;
  /** An optional label for the switch */
  label?: string;
  /** Whether the label should be positioned on left or right. Defaults to right */
  labelPosition?: "left" | "right";
  /** An optional note to display below the switch */
  note?: React.ReactNode;
  /** Name of the input */
  name?: string;
  /** Whether the switch is checked */
  checked?: boolean;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Callback when the switch state changes */
  onChange?: (checked: boolean) => void;
  inForm?: boolean;
  ref?: React.Ref<React.ComponentRef<typeof RadixSwitch.Root>>;
}

function Switch({
  ref,
  width = 32,
  height = 18,
  labelPosition = "left",
  inForm = true,
  label,
  disabled,
  className,
  note,
  checked,
  onChange,
  ...props
}: Props) {
  const handleCheckedChange = React.useCallback(
    (checkedState: boolean) => {
      if (onChange) {
        onChange(checkedState);
      }
    },
    [onChange]
  );

  const component = (
    <StyledSwitchRoot
      ref={ref}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      disabled={disabled}
      width={width}
      height={height}
      className={label ? undefined : className}
      {...props}
    >
      <StyledSwitchThumb />
    </StyledSwitchRoot>
  );

  if (label) {
    return (
      <Wrapper $inForm={inForm}>
        <Label
          disabled={disabled}
          htmlFor={props.id}
          className={className}
          $labelPosition={labelPosition}
        >
          {component}
          <InlineLabelText>{label}</InlineLabelText>
        </Label>
        {note && (
          <Text
            type="secondary"
            size="small"
            style={{
              paddingRight: labelPosition === "left" ? width : 0,
              paddingLeft: labelPosition === "right" ? width : 0,
            }}
          >
            {note}
          </Text>
        )}
      </Wrapper>
    );
  }

  return component;
}

const Wrapper = styled.div<{ $inForm?: boolean }>`
  padding-bottom: ${(props) => (props.$inForm ? 8 : 0)}px;
  ${undraggableOnDesktop()}
`;

const InlineLabelText = styled(LabelText)`
  padding-bottom: 0;
  width: 100%;
`;

const Label = styled.label<{
  disabled?: boolean;
  $labelPosition: "left" | "right";
}>`
  display: flex;
  align-items: center;
  user-select: none;
  gap: 8px;

  ${(props) =>
    props.$labelPosition === "left" ? `flex-direction: row-reverse;` : ""}
  ${(props) => (props.disabled ? `opacity: 0.75;` : "")}
`;

const HOVER_EXTRA = 3;

/** Minimum switch size on mobile, so that small switches stay usable by touch. */
const MOBILE_MIN_WIDTH = 32;
const MOBILE_MIN_HEIGHT = 18;

const StyledSwitchThumb = styled(RadixSwitch.Thumb)`
  display: block;
  width: calc(var(--switch-height) - 8px);
  height: calc(var(--switch-height) - 8px);
  background-color: white;
  border-radius: calc((var(--switch-height) - 8px) / 2);
  transition:
    transform 0.2s,
    width 0.2s;
  transform: translateX(0);
  will-change: transform, width;

  &[data-state="checked"] {
    transform: translateX(calc(var(--switch-width) - var(--switch-height)));
  }

  [dir="rtl"] &[data-state="checked"] {
    transform: translateX(calc(var(--switch-height) - var(--switch-width)));
  }
`;

const StyledSwitchRoot = styled(RadixSwitch.Root)<{
  width: number;
  height: number;
}>`
  --switch-width: ${(props) => Math.max(props.width, MOBILE_MIN_WIDTH)}px;
  --switch-height: ${(props) => Math.max(props.height, MOBILE_MIN_HEIGHT)}px;

  position: relative;
  width: var(--switch-width);
  height: var(--switch-height);
  background-color: ${(props) => props.theme.slate};
  border-radius: var(--switch-height);
  border: none;
  cursor: var(--pointer);
  transition: background-color 0.2s;
  padding: 0 4px;
  flex-shrink: 0;

  ${(props) => breakpoint("tablet")`
    --switch-width: ${props.width}px;
    --switch-height: ${props.height}px;
  `}

  &:focus {
    box-shadow: 0 0 1px ${s("accent")};
    outline: none;
  }

  &[data-state="checked"] {
    background-color: ${s("accent")};
  }

  &:active:not(:disabled) {
    background-color: ${(props) => darken(0.1, props.theme.slate)};
  }

  &:active:not(:disabled)[data-state="checked"] {
    background-color: ${(props) => darken(0.1, props.theme.accent)};
  }

  &:disabled {
    opacity: 0.75;
    cursor: default;
  }

  &:hover:not(:disabled) ${StyledSwitchThumb} {
    width: calc(var(--switch-height) - 8px + ${HOVER_EXTRA}px);
  }

  &:hover:not(:disabled)[data-state="checked"] ${StyledSwitchThumb} {
    transform: translateX(
      calc(var(--switch-width) - var(--switch-height) - ${HOVER_EXTRA}px)
    );
  }

  [dir="rtl"]
  &:hover:not(:disabled)[data-state="checked"]
  ${StyledSwitchThumb} {
    transform: translateX(
      calc(var(--switch-height) - var(--switch-width) + ${HOVER_EXTRA}px)
    );
  }
`;

export default Switch;
