import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

interface Props extends React.HTMLAttributes<HTMLInputElement> {
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
}

function Switch(
  {
    width = 32,
    height = 18,
    labelPosition = "left",
    label,
    disabled,
    className,
    note,
    ...props
  }: Props,
  ref: React.Ref<HTMLInputElement>
) {
  const component = (
    <Input
      width={width}
      height={height}
      className={label ? undefined : className}
    >
      <HiddenInput
        ref={ref}
        type="checkbox"
        width={width}
        height={height}
        disabled={disabled}
        {...props}
      />
      <Slider width={width} height={height} />
    </Input>
  );

  if (label) {
    return (
      <Wrapper>
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

const Wrapper = styled.div`
  padding-bottom: 8px;
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

const Input = styled.label<{ width: number; height: number }>`
  position: relative;
  display: inline-block;
  width: ${(props) => props.width}px;
  height: ${(props) => props.height}px;
  flex-shrink: 0;
`;

const Slider = styled.span<{ width: number; height: number }>`
  position: absolute;
  cursor: var(--pointer);
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) => props.theme.slate};
  -webkit-transition: 0.4s;
  transition: 0.4s;
  border-radius: ${(props) => props.height}px;

  &:before {
    position: absolute;
    content: "";
    height: ${(props) => props.height - 8}px;
    width: ${(props) => props.height - 8}px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    border-radius: 50%;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }
`;

const HiddenInput = styled.input<{ width: number; height: number }>`
  opacity: 0;
  width: 0;
  height: 0;
  visibility: hidden;

  &:disabled + ${Slider} {
    opacity: 0.75;
    cursor: default;
  }

  &:checked + ${Slider} {
    background-color: ${s("accent")};
  }

  &:focus + ${Slider} {
    box-shadow: 0 0 1px ${s("accent")};
  }

  &:checked + ${Slider}:before {
    transform: translateX(${(props) => props.width - props.height}px);
  }
`;

export default React.forwardRef(Switch);
