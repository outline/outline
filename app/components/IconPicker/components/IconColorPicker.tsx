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
    <Container justify="space-between" align="center" auto>
      <PresetColors activeColor={selectedColor} onClick={handleSelect} />
      <Divider />
      <SwatchButton
        color={color}
        active={!isBuiltInColor}
        onChange={handleSelect}
        pickerInModal
      />
    </Container>
  );
};

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background-color: ${s("inputBorder")};
`;

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
        onClick={() => onClick(color)}
      />
    ))}
  </>
);

const Container = styled(Flex)`
  height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid ${s("inputBorder")};
`;

export default IconColorPicker;
