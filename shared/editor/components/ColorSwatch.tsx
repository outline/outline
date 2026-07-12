import copy from "copy-to-clipboard";
import type { MouseEvent } from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

interface Props {
  /** The CSS color the swatch represents, in its original notation. */
  color: string;
  /** The relative luminance of the color, used to pick an outline. */
  luminance: number;
}

/**
 * A small colored circle rendered after a CSS color inside inline code. Clicking
 * it copies the color to the clipboard.
 */
export function ColorSwatch({ color, luminance }: Props) {
  const { t } = useTranslation();

  const handleMouseDown = useCallback((event: MouseEvent) => {
    // Prevent the editor from moving the cursor into the code mark on click.
    event.preventDefault();
  }, []);

  const handleClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      copy(color);
      toast.message(t("Copied to clipboard"));
    },
    [color, t]
  );

  const className = [
    EditorStyleHelper.colorSwatch,
    luminance > 0.85 && EditorStyleHelper.colorSwatchLight,
    luminance < 0.1 && EditorStyleHelper.colorSwatchDark,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={className}
      aria-hidden="true"
      title={t("Click to copy")}
      style={{ backgroundColor: color }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    />
  );
}
