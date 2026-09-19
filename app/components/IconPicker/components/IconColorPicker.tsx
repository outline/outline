import * as React from "react";
import styled from "styled-components";
import { colorPalette } from "@shared/constants";
import { SwatchButton } from "~/components/SwatchButton";
import { ColorButton } from "~/components/ColorButton";

const SWATCH_SIZE = 20;

type Props = {
  width: number;
  activeColor: string;
  onSelect: (color: string) => void;
};

const IconColorPicker = ({ activeColor, onSelect }: Props) => {
  const [selectedColor, setSelectedColor] = React.useState(activeColor);
  const isBuiltInColor = colorPalette.includes(selectedColor);
  const color = isBuiltInColor ? undefined : selectedColor;

  React.useEffect(() => {
    setSelectedColor(activeColor);
  }, [activeColor]);

  const handleSelect = (color: string) => {
    setSelectedColor(color);
    onSelect(color);
  };

  return (
    <Container>
      <PresetColors activeColor={selectedColor} onClick={handleSelect} />
      <SwatchButton
        color={color}
        pickerColor={selectedColor}
        active={!isBuiltInColor}
        size={SWATCH_SIZE}
        onChange={handleSelect}
        pickerInModal
      />
    </Container>
  );
};

const PresetColors = ({
  activeColor,
  onClick,
}: {
  activeColor: string;
  onClick: (color: string) => void;
}) => (
  <>
    {colorPalette.map((color) => (
      <ColorButton
        key={color}
        color={color}
        active={color === activeColor}
        size={SWATCH_SIZE}
        onClick={() => onClick(color)}
      />
    ))}
  </>
);

// One column per preset color plus the custom swatch, matching the horizontal
// rhythm of the icon grid below.
const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(${colorPalette.length + 1}, 1fr);
  align-items: center;
  justify-items: center;
  height: 48px;
  padding: 8px 12px;
`;

export default IconColorPicker;
