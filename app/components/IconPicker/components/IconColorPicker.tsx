import * as React from "react";
import styled from "styled-components";
import { SwatchButton } from "~/components/SwatchButton";
import { ColorButton } from "~/components/ColorButton";
import useColorPalette from "~/hooks/useColorPalette";

const SWATCH_SIZE = 20;

type Props = {
  width: number;
  activeColor: string;
  onSelect: (color: string) => void;
};

const IconColorPicker = ({ activeColor, onSelect }: Props) => {
  const colorPalette = useColorPalette();
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
    <Container $columns={colorPalette.length + 1}>
      <PresetColors
        colors={colorPalette}
        activeColor={selectedColor}
        onClick={handleSelect}
      />
      <SwatchButton
        color={color}
        pickerColor={selectedColor}
        active={!isBuiltInColor}
        size={SWATCH_SIZE}
        onChange={handleSelect}
        showPresets={false}
        pickerInModal
      />
    </Container>
  );
};

const PresetColors = ({
  colors,
  activeColor,
  onClick,
}: {
  colors: string[];
  activeColor: string;
  onClick: (color: string) => void;
}) => (
  <>
    {colors.map((color) => (
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
const Container = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  align-items: center;
  justify-items: center;
  height: 48px;
  padding: 8px 12px;
`;

export default IconColorPicker;
