import * as RadixSwitch from "@radix-ui/react-switch";
import { darken } from "polished";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

interface Props extends Omit<
  React.ComponentProps<typeof RadixSwitch.Root>,
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
}

function Switch(
  {
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
  }: Props,
  ref: React.Ref<React.ElementRef<typeof RadixSwitch.Root>>
) {
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
      <StyledSwitchThumb width={width} height={height} />
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

const StyledSwitchThumb = styled(RadixSwitch.Thumb)<{
  width: number;
  height: number;
}>`
  display: block;
  width: ${(props) => props.height - 8}px;
  height: ${(props) => props.height - 8}px;
  background-color: white;
  border-radius: ${(props) => (props.height - 8) / 2}px;
  transition:
    transform 0.2s,
    width 0.2s;
  transform: translateX(0);
  will-change: transform, width;

  &[data-state="checked"] {
    transform: translateX(${(props) => props.width - props.height}px);
  }

  [dir="rtl"] &[data-state="checked"] {
    transform: translateX(${(props) => -(props.width - props.height)}px);
  }
`;

const StyledSwitchRoot = styled(RadixSwitch.Root)<{
  width: number;
  height: number;
}>`
  position: relative;
  width: ${(props) => props.width}px;
  height: ${(props) => props.height}px;
  background-color: ${(props) => props.theme.slate};
  border-radius: ${(props) => props.height}px;
  border: none;
  cursor: var(--pointer);
  transition: background-color 0.2s;
  padding: 0 4px;
  flex-shrink: 0;

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
    width: ${(props) => props.height - 8 + HOVER_EXTRA}px;
  }

  &:hover:not(:disabled)[data-state="checked"] ${StyledSwitchThumb} {
    transform: translateX(
      ${(props) => props.width - props.height - HOVER_EXTRA}px
    );
  }

  [dir="rtl"]
    &:hover:not(:disabled)[data-state="checked"]
    ${StyledSwitchThumb} {
    transform: translateX(
      ${(props) => -(props.width - props.height - HOVER_EXTRA)}px
    );
  }
`;

export default React.forwardRef(Switch);
