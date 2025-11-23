import * as React from "react";
import debounce from "lodash/debounce";
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
  const [selectedColor, setSelectedColor] = React.useState(activeColor);
  const isBuiltInColor = colorPalette.includes(selectedColor);
  const color = isBuiltInColor ? undefined : selectedColor;

  const debouncedOnSelect = React.useMemo(
    () =>
      debounce((color: string) => {
        onSelect(color);
      }, 250),
    [onSelect]
  );

  React.useEffect(
    () => () => {
      debouncedOnSelect.cancel();
    },
    [debouncedOnSelect]
  );

  React.useEffect(() => {
    setSelectedColor(activeColor);
  }, [activeColor]);

  const handleSelect = (color: string) => {
    setSelectedColor(color);
    debouncedOnSelect(color);
  };

  return (
    <BuiltinColors activeColor={selectedColor} onClick={handleSelect}>
      <Divider />
      <SwatchButton
        color={color}
        active={!isBuiltInColor}
        onChange={handleSelect}
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
