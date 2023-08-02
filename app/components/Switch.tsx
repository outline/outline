import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

type Props = React.HTMLAttributes<HTMLInputElement> & {
  width?: number;
  height?: number;
  label?: string;
  name?: string;
  note?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
  id?: string;
};

function Switch({
  width = 32,
  height = 18,
  label,
  disabled,
  className,
  note,
  ...props
}: Props) {
  const component = (
    <Input
      width={width}
      height={height}
      className={label ? undefined : className}
    >
      <HiddenInput
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
        <Label disabled={disabled} htmlFor={props.id} className={className}>
          {component}
          <InlineLabelText>{label}</InlineLabelText>
        </Label>
        {note && (
          <Text type="secondary" size="small">
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
`;

const Label = styled.label<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  user-select: none;
  ${(props) => (props.disabled ? `opacity: 0.75;` : "")}
`;

const Input = styled.label<{ width: number; height: number }>`
  position: relative;
  display: inline-block;
  width: ${(props) => props.width}px;
  height: ${(props) => props.height}px;
  flex-shrink: 0;

  &:not(:last-child) {
    margin-right: 8px;
  }
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

export default Switch;
