import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DelayedMount from "./DelayedMount";
import NudeButton from "./NudeButton";
import { Popover, PopoverTrigger, PopoverContent } from "./primitives/Popover";
import Text from "./Text";

/**
 * Props for the SwatchButton component.
 */
type SwatchButtonProps = {
  /** The current color value in hex format */
  color?: string;
  /** Callback function invoked when the color is changed */
  onChange: (color: string) => void;
  /** Additional CSS class name to apply to the button */
  className?: string;
  /** Whether to render the color picker in a modal popover. Defaults to true */
  pickerInModal?: boolean;
};

export const SwatchButton: React.FC<SwatchButtonProps> = ({
  color,
  onChange,
  className,
  pickerInModal = true,
}) => {
  const { t } = useTranslation();

  return (
    <Popover modal={pickerInModal}>
      <PopoverTrigger>
        <StyledSwatchButton
          aria-label={t("Select a color")}
          className={className}
          style={{ background: color }}
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

const StyledSwatchButton = styled(NudeButton)`
  background: ${s("menuBackground")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 50%;
`;

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
