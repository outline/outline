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

/** Keys that have a platform-specific display, or a name that differs from it. */
const namedKeys: Record<string, ResolvedKey> = {
  meta: {
    display: metaDisplay,
    label: isMac ? "Command" : "Control",
    symbol: true,
  },
  ctrl: { display: "Ctrl", label: "Control", symbol: false },
  alt: { display: altDisplay, label: isMac ? "Option" : "Alt", symbol: true },
  shift: { display: "⇧", label: "Shift", symbol: true },
  enter: isMac
    ? { display: "Return", label: "Return", symbol: false }
    : { display: "Enter", label: "Enter", symbol: false },
  tab: { display: "Tab", label: "Tab", symbol: false },
  space: { display: "Space", label: "Space", symbol: false },
  esc: { display: "Esc", label: "Escape", symbol: false },
  up: { display: "↑", label: "Up arrow", symbol: true },
  down: { display: "↓", label: "Down arrow", symbol: true },
};

/**
 * Displays a keyboard shortcut as a series of keys, announced to screen readers
 * as a single instruction such as "Command plus K".
 *
 * @param props The keys of the shortcut and how they are combined.
 * @returns A React element displaying the shortcut.
 */
export function KeyboardShortcut({ keys, combination = "hold" }: Props) {
  const { t } = useTranslation();

  const resolved = keys.map((key): ResolvedKey => {
    if (typeof key === "string") {
      return (
        namedKeys[key] ?? {
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
