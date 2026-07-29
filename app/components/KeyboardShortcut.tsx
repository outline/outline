import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { isMac } from "@shared/utils/browser";
import { altDisplay, metaDisplay } from "@shared/utils/keyboard";
import Key from "~/components/Key";

/** A key in a shortcut, either the name of a well-known key or an explicit definition. */
export type ShortcutKey =
  | string
  | {
      /** The character(s) shown on screen */
      display: string;
      /** The name announced by screen readers, defaults to the displayed character(s) */
      label?: string;
      /** Set to true if displaying a single symbol character to disable monospace */
      symbol?: boolean;
    };

/** How the keys of a shortcut relate to one another. */
export type KeyCombination =
  /** Keys are held down together */
  | "hold"
  /** Keys are pressed one after another */
  | "sequence"
  /** Any one of the keys triggers the shortcut */
  | "alternative";

type Props = {
  /** The keys that make up the shortcut, in the order they are pressed */
  keys: ShortcutKey[];
  /** How the keys relate to one another, defaults to being held down together */
  combination?: KeyCombination;
};

type ResolvedKey = { display: string; label: string; symbol: boolean };

/**
 * Displays a keyboard shortcut as a series of keys, announced to screen readers
 * as a single instruction such as "Command plus K".
 *
 * @param props The keys of the shortcut and how they are combined.
 * @returns A React element displaying the shortcut.
 */
export function KeyboardShortcut({ keys, combination = "hold" }: Props) {
  const { t } = useTranslation();

  const named: Record<string, ResolvedKey> = {
    meta: {
      display: metaDisplay,
      label: isMac ? t("Command") : t("Control"),
      symbol: true,
    },
    ctrl: { display: "Ctrl", label: t("Control"), symbol: false },
    alt: {
      display: altDisplay,
      label: isMac ? t("Option") : t("Alt"),
      symbol: true,
    },
    shift: { display: "⇧", label: t("Shift"), symbol: true },
    enter: { display: t("Enter"), label: t("Enter"), symbol: false },
    tab: { display: t("Tab"), label: t("Tab"), symbol: false },
    space: { display: t("Space"), label: t("Space"), symbol: false },
    esc: { display: "Esc", label: t("Escape"), symbol: false },
    up: { display: "↑", label: t("Up arrow"), symbol: true },
    down: { display: "↓", label: t("Down arrow"), symbol: true },
  };

  const resolved = keys.map((key): ResolvedKey => {
    if (typeof key === "string") {
      return (
        named[key] ?? {
          display: key,
          label: key.length === 1 ? key.toLocaleUpperCase() : key,
          symbol: false,
        }
      );
    }

    return {
      display: key.display,
      label: key.label ?? key.display,
      symbol: key.symbol ?? false,
    };
  });

  const separator =
    combination === "hold" ? "+" : combination === "alternative" ? t("or") : "";
  const spokenSeparator =
    combination === "hold"
      ? t("plus")
      : combination === "alternative"
        ? t("or")
        : t("then");

  return (
    <span
      role="img"
      aria-label={resolved.map((key) => key.label).join(` ${spokenSeparator} `)}
    >
      {resolved.map((key, index) => (
        <Fragment key={index}>
          {index > 0 && (separator ? ` ${separator} ` : " ")}
          <Key symbol={key.symbol}>{key.display}</Key>
        </Fragment>
      ))}
    </span>
  );
}
