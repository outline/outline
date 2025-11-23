import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DelayedMount from "./DelayedMount";
import { Popover, PopoverTrigger, PopoverContent } from "./primitives/Popover";
import Text from "./Text";
import { ColorButton } from "./ColorButton";

/**
 * Props for the SwatchButton component.
 */
type SwatchButtonProps = {
  /** The current color value in hex format. If no color is passed a radial gradient will be shown */
  color?: string;
  /** Whether the swatch button is currently active/selected */
  active?: boolean;
  /** The size of the button in pixels */
  size?: number;
  /** Callback function invoked when the color is changed */
  onChange: (color: string) => void;
  /** Additional CSS class name to apply to the button */
  className?: string;
  /** Whether to render the color picker in a modal popover. Defaults to true */
  pickerInModal?: boolean;
};

export const SwatchButton: React.FC<SwatchButtonProps> = ({
  color,
  active = false,
  size = 24,
  onChange,
  className,
  pickerInModal = true,
}) => {
  const { t } = useTranslation();
  return (
    <Popover modal={pickerInModal}>
      <PopoverTrigger>
        <ColorButton
          aria-label={t("Select a color")}
          className={className}
          color={color}
          active={active}
          size={size}
        />
      </PopoverTrigger>
      <StyledContent
        side="bottom"
        align="end"
        aria-label={t("Select a color")}
        shrink
      >
        <React.Suspense
          fallback={
            <DelayedMount>
              <Text>{t("Loading")}…</Text>
            </DelayedMount>
          }
        >
          <StyledColorPicker
            disableAlpha
            color={color}
            onChange={(c) => onChange(c.hex)}
          />
        </React.Suspense>
      </StyledContent>
    </Popover>
  );
};

const StyledContent = styled(PopoverContent)`
  width: auto;
  padding: 8px;
`;

const ColorPicker = lazyWithRetry(
  () => import("react-color/lib/components/chrome/Chrome")
);

const StyledColorPicker = styled(ColorPicker)`
  background: inherit !important;
  box-shadow: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  user-select: none;

  input {
    user-select: text;
    color: ${s("text")} !important;
  }
`;
