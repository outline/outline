import type { TFunction } from "i18next";
import type { Node as ProsemirrorNode, Schema } from "prosemirror-model";
import type { EditorState, Selection } from "prosemirror-state";
import type { Decoration, EditorView } from "prosemirror-view";
import * as React from "react";
import type { DefaultTheme } from "styled-components";
import type { Primitive } from "utility-types";

export type NodeWithPos = {
  pos: number;
  node: ProsemirrorNode;
};

export type PlainTextSerializer = (node: ProsemirrorNode) => string;

/** The severity of a notice surfaced to the user from the editor. */
export type EditorNoticeType = "info" | "success" | "warning" | "error";

/**
 * Callback used by the editor to surface a short notice (e.g. a toast) to the
 * user. Provided by the host application so shared editor code stays agnostic
 * of any specific notification library.
 */
export type EditorNotice = (message: string, type?: EditorNoticeType) => void;

export enum TableLayout {
  fullWidth = "full-width",
}

/** How a selection toolbar menu is presented. */
export enum MenuType {
  /** A horizontal strip of buttons; nested options open behind a trigger. */
  toolbar = "toolbar",
  /** A vertical menu rendered directly, anchored to the selection. */
  inline = "inline",
}

type Section = ({ t }: { t: TFunction }) => string;

export type MenuItem = {
  icon?: React.ReactNode;
  name?: string;
  title?: string;
  section?: Section;
  subtitle?: React.ReactNode;
  shortcut?: string;
  keywords?: string;
  tooltip?: string;
  label?: string;
  dangerous?: boolean;
  /** Higher number is higher in results, default is 0. */
  priority?: number;
  children?: MenuItem[] | (() => MenuItem[]);
  defaultHidden?: boolean;
  attrs?:
    | Record<string, Primitive | null>
    | ((state: EditorState) => Record<string, Primitive | null>);
  visible?: boolean;
  active?: (state: EditorState) => boolean;
  appendSpace?: boolean;
  skipIcon?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Custom React content to render instead of a standard menu item */
  content?: React.ReactNode;
  /** Condition to check before preventing the submenu from closing */
  preventCloseCondition?: () => boolean;
};

export type ComponentProps = {
  /** The current editor theme. */
  theme: DefaultTheme;
  /** The editor view instance. */
  view: EditorView;
  /** The node the component is rendering. */
  node: ProsemirrorNode;
  /** Whether the node is currently selected. */
  isSelected: boolean;
  /** Whether the editor is editable. */
  isEditable: boolean;
  /** A function that returns the current position of the node in the document. */
  getPos: () => number;
  /** The decorations applied to the node. */
  decorations: Decoration[];
  /** Ref callback marking the element that ProseMirror-managed content is mounted within. */
  contentRef?: (element: HTMLElement | null) => void;
};

export type NodeAttrMarkName =
  | "strong"
  | "em"
  | "code_inline"
  | "link"
  | "background"
  | "strikethrough"
  | "underline"
  | "placeholder"
  | "comment";

export interface NodeAttrMark {
  type: NodeAttrMarkName;
  attrs?: Record<string, unknown>;
}

/**
 * Cached selection state computed once per editor update and shared across
 * all menu functions. Avoids repeated queries against the same EditorState.
 */
export interface SelectionContext {
  /** The current editor state. */
  state: EditorState;
  /** The editor schema. */
  schema: Schema;
  /** The current selection. */
  selection: Selection;
  /** Whether the selection is empty (cursor with no range). */
  isEmpty: boolean;
  /** Whether the device is a mobile device. */
  isMobile: boolean;
  /** Whether the device supports touch input. */
  isTouch: boolean;
  /** Whether the editor is in read-only mode. */
  readOnly: boolean;
  /** Whether the document is a template. */
  isTemplate: boolean;
  /** Whether text direction is right-to-left. */
  rtl: boolean;
  /** Whether the selection is inside inline or block code. */
  isInCode: boolean;
  /** Whether the selection is inside a code block (not inline code). */
  isInCodeBlock: boolean;
  /** Whether the selection is inside a list. */
  isInList: boolean;
  /** Whether the selection is inside a notice/callout block. */
  isInNotice: boolean;
  /** Whether the selection is a table cell selection. */
  isTableCell: boolean;
  /** Whether the entire table is selected. */
  isTableSelected: boolean;
  /** The node type name when a NodeSelection is active, otherwise undefined. */
  selectedNodeType: string | undefined;
  /** The selected column index when a column drag handle is active. */
  colIndex: number | undefined;
  /** The selected row index when a row drag handle is active. */
  rowIndex: number | undefined;
}

/**
 * Describes a selection toolbar menu contributed by an extension. Extensions
 * return this from their `selectionToolbarMenu()` method so the toolbar can
 * pick the right menu for the current selection.
 */
export interface SelectionToolbarMenuDescriptor {
  /**
   * Predicate that returns true when this menu should be shown for the
   * current selection. The first matching menu (by priority) wins.
   *
   * @param ctx - the current selection context.
   * @returns whether this menu matches.
   */
  matches: (ctx: SelectionContext) => boolean;
  /**
   * Higher-priority menus are checked first. Built-in menus use priorities
   * 0–100. Extensions should use values above 100 to override, or negative
   * values to act as fallbacks.
   */
  priority: number;
  /** Toolbar alignment when this menu is active. Defaults to "center". */
  align?: "center" | "start" | "end";
  /**
   * Whether the toolbar is anchored to a block rather than a transient text
   * selection. Block toolbars (code, notice) stay visible while the caret sits
   * in the block, so on desktop they are rendered as a sticky element that pins
   * to the top of the viewport as the block scrolls, instead of a floating
   * toolbar positioned once and left behind on scroll.
   */
  sticky?: boolean;
  /**
   * How the menu is presented. "toolbar" (default) renders a horizontal strip
   * of buttons; "inline" renders a vertical menu anchored to the selection
   * without requiring a trigger button.
   */
  variant?: MenuType;
  /**
   * Returns the menu items to display for the current selection.
   *
   * @param ctx - the current selection context.
   * @returns an array of menu items.
   */
  getItems: (ctx: SelectionContext) => MenuItem[];
}
