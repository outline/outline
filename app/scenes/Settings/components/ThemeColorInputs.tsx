import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { buildDarkTheme, buildLightTheme } from "@shared/styles/theme";
import { hasSufficientContrast } from "@shared/utils/color";
import InputColor from "~/components/InputColor";

interface Props {
  /** The accent color as entered, may be empty or not yet a valid color. */
  accent: string | null | undefined;
  /** The accent text color as entered, may be empty or not yet a valid color. */
  accentText: string | null | undefined;
  /** Callback when the accent color changes. */
  onAccentChange: (value: string) => void;
  /** Callback when the accent text color changes. */
  onAccentTextChange: (value: string) => void;
}

/**
 * Inputs for the workspace accent and accent text colors. Shows a warning when
 * the accent has low contrast against the light or dark background, or when
 * the accent text has low contrast against the accent.
 */
export function ThemeColorInputs({
  accent,
  accentText,
  onAccentChange,
  onAccentTextChange,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const accentWarning = useMemo(() => {
    const lightTheme = buildLightTheme({ accent: theme.accent });
    const darkTheme = buildDarkTheme({ accent: theme.accent });
    const lowInLight = !hasSufficientContrast(
      lightTheme.accent,
      lightTheme.background,
      3
    );
    const lowInDark = !hasSufficientContrast(
      darkTheme.accent,
      darkTheme.background,
      3
    );

    if (lowInLight && lowInDark) {
      return t("This color has low contrast in light and dark mode");
    }
    if (lowInLight) {
      return t("This color has low contrast in light mode");
    }
    if (lowInDark) {
      return t("This color has low contrast in dark mode");
    }
    return undefined;
  }, [theme.accent, t]);

  const accentTextWarning = hasSufficientContrast(
    theme.accentText,
    theme.accent
  )
    ? undefined
    : t("This color has low contrast against the accent color");

  return (
    <>
      <InputColor
        id="accent"
        value={accent ?? theme.accent}
        label={t("Accent color")}
        onChange={onAccentChange}
        warning={accentWarning}
        flex
      />
      <InputColor
        id="accentText"
        value={accentText ?? theme.accentText}
        label={t("Accent text color")}
        onChange={onAccentTextChange}
        warning={accentTextWarning}
        flex
      />
    </>
  );
}
