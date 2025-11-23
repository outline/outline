import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { colorPalette } from "@shared/utils/collections";
import Flex from "~/components/Flex";
import { SwatchButton } from "~/components/SwatchButton";
import { ColorButton } from "~/components/ColorButton";

type Props = {
  width: number;
  activeColor: string;
  onSelect: (color: string) => void;
};

const ColorPicker = ({ activeColor, onSelect }: Props) => {
  const isBuiltInColor = colorPalette.includes(activeColor);
  const color = isBuiltInColor ? undefined : activeColor;

  return (
    <BuiltinColors activeColor={activeColor} onClick={onSelect}>
      <Divider />
      <SwatchButton
        color={color}
        active={!isBuiltInColor}
        onChange={onSelect}
        pickerInModal
      />
    </BuiltinColors>
  );
};

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${s("inputBorder")};
`;

const BuiltinColors = ({
  activeColor,
  onClick,
  className,
  children,
}: {
  activeColor: string;
  onClick: (color: string) => void;
  className?: string;
  children?: React.ReactNode;
}) => (
  <Container className={className} justify="space-between" align="center" auto>
    {colorPalette.map((color) => (
      <ColorButton
        key={color}
        color={color}
        active={color === activeColor}
        onClick={() => onClick(color)}
      />
    ))}
    {children}
  </Container>
);

const Container = styled(Flex)`
  height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid ${s("inputBorder")};
`;

export default ColorPicker;
