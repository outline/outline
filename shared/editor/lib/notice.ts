import type { IconName } from "../../utils/IconNames";

export enum NoticeTypes {
  Info = "info",
  Success = "success",
  Tip = "tip",
  Warning = "warning",
}

/** The icon and color a notice falls back to when it has none of its own. */
export interface NoticePreset {
  /** The name of an icon in the icon library. */
  icon: IconName;
  /** The theme key of the color used for the icon, border and background. */
  color:
    | "noticeInfoBackground"
    | "noticeSuccessBackground"
    | "noticeTipBackground"
    | "noticeWarningBackground";
}

/**
 * The built-in notice presets, offered as separate blocks in the insert menu.
 * An icon or color chosen on an individual notice overrides its preset.
 */
export const noticePresets: Record<NoticeTypes, NoticePreset> = {
  [NoticeTypes.Info]: { icon: "info", color: "noticeInfoBackground" },
  [NoticeTypes.Success]: { icon: "done", color: "noticeSuccessBackground" },
  [NoticeTypes.Tip]: { icon: "starred", color: "noticeTipBackground" },
  [NoticeTypes.Warning]: { icon: "warning", color: "noticeWarningBackground" },
};

/** The attributes of a notice that are encoded in its markdown fence. */
export interface NoticeAttrs {
  style: string;
  icon: string | null;
  color: string | null;
}

/**
 * Returns the preset for a notice style, falling back to the info preset for
 * styles written by other tools.
 *
 * @param style - the style attribute of a notice.
 * @returns the matching preset.
 */
export function getNoticePreset(style: string): NoticePreset {
  return noticePresets[style as NoticeTypes] ?? noticePresets[NoticeTypes.Info];
}

/**
 * Parses the info string of a notice fence, such as
 * `info icon=starred color=#FF5C80`. Icons and colors that are not in a format
 * we recognize are discarded so they cannot reach the DOM.
 *
 * @param info - the text following the opening fence.
 * @returns the notice attributes.
 */
export function parseNoticeInfo(info: string): NoticeAttrs {
  const [style, ...rest] = (info ?? "").trim().split(/\s+/);
  const attrs: NoticeAttrs = {
    style: style || NoticeTypes.Info,
    icon: null,
    color: null,
  };

  for (const part of rest) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);

    if (key === "icon") {
      attrs.icon = parseNoticeIcon(value);
    } else if (key === "color") {
      attrs.color = parseNoticeColor(value);
    }
  }

  return attrs;
}

/**
 * Validates an icon read from an untrusted source, such as pasted markup.
 *
 * @param value - the icon name, emoji, or custom emoji id.
 * @returns the icon, or null if it is not in a format we recognize.
 */
export function parseNoticeIcon(value?: string | null): string | null {
  return value && value.length <= maxIconLength && !/\s/.test(value)
    ? value
    : null;
}

/**
 * Validates a color read from an untrusted source, such as pasted markup. The
 * color reaches inline styles, so only hex notation is accepted.
 *
 * @param value - the color.
 * @returns the color, or null if it is not a hex color.
 */
export function parseNoticeColor(value?: string | null): string | null {
  return value && colorRegex.test(value) ? value : null;
}

/**
 * Serializes notice attributes into the info string of a markdown fence. A
 * notice using its preset icon and color serializes to the style alone, so
 * existing documents are unchanged.
 *
 * @param attrs - the notice attributes.
 * @returns the text to follow the opening fence.
 */
export function serializeNoticeInfo(attrs: Partial<NoticeAttrs>): string {
  const parts = [attrs.style || NoticeTypes.Info];
  const icon = parseNoticeIcon(attrs.icon);
  const color = parseNoticeColor(attrs.color);

  if (icon) {
    parts.push(`icon=${icon}`);
  }
  if (color) {
    parts.push(`color=${color}`);
  }

  return parts.join(" ");
}

const colorRegex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const maxIconLength = 64;
