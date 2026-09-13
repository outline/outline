import * as React from "react";

export interface IconPickerProps {
  /** The currently chosen icon, either an icon name, emoji, or custom emoji id. */
  icon: string | null;
  /** The color applied to SVG icons. */
  color: string;
  /** The size of the icon in the trigger. */
  size?: number;
  /** The initial to display when the chosen icon is a letter icon. */
  initial: string;
  /** Where the picker is positioned relative to its trigger. */
  popoverPosition: "bottom-start" | "right";
  /** Whether the picker offers removing the current icon. */
  allowDelete?: boolean;
  /** Whether the trigger gains a border on hover. */
  borderOnHover?: boolean;
  /** Called with the chosen icon and color, or nulls when removed. */
  onChange: (icon: string | null, color: string | null) => void;
  /** The trigger content. */
  children?: React.ReactNode;
}

/**
 * Provides the application's icon picker to editor node views. The picker
 * itself depends on app stores and components that shared code cannot import,
 * so the app injects it here and node views render it when present.
 */
export const IconPickerContext =
  React.createContext<React.ComponentType<IconPickerProps> | null>(null);
