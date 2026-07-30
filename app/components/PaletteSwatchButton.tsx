import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { colorPalette } from "@shared/constants";
import { ColorButton } from "./ColorButton";
import { Popover, PopoverTrigger, PopoverContent } from "./primitives/Popover";

/**
 * Props for the PaletteSwatchButton component.
 */
type PaletteSwatchButtonProps = {
  /** The current color value in hex format. If no color is passed a radial gradient will be shown. */
  color?: string;
  /** The size of the button in pixels. */
  size?: number;
  /** Callback invoked with the chosen color. */
  onChange: (color: string) => void;
  /** Additional CSS class name to apply to the button. */
  className?: string;
};

/**
 * A color swatch that opens a small grid of the app's predefined colors,
 * unlike SwatchButton which opens a free-form picker. Use where an arbitrary
 * color would harm legibility or consistency.
 */
export const PaletteSwatchButton: React.FC<PaletteSwatchButtonProps> = ({
  color,
  size = 24,
  onChange,
  className,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <ColorButton
          aria-label={t("Select a color")}
          className={className}
          color={color}
          size={size}
        />
      </PopoverTrigger>
      <Swatches
        side="bottom"
        align="start"
        aria-label={t("Select a color")}
        scrollable={false}
        shrink
      >
        {colorPalette.map((value) => (
          <ColorButton
            key={value}
            aria-label={value}
            color={value}
            active={color?.toLowerCase() === value.toLowerCase()}
            size={size}
            onClick={() => handleSelect(value)}
          />
        ))}
      </Swatches>
    </Popover>
  );
};

const Swatches = styled(PopoverContent)`
  display: grid;
  grid-template-columns: repeat(5, auto);
  gap: 8px;
  padding: 8px;
  width: auto;
`;
