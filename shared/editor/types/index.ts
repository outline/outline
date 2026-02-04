import type { TFunction } from "i18next";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { Decoration, EditorView } from "prosemirror-view";
import * as React from "react";
import type { DefaultTheme } from "styled-components";
import type { Primitive } from "utility-types";

export type NodeWithPos = {
  pos: number;
  node: ProsemirrorNode;
};

export type PlainTextSerializer = (node: ProsemirrorNode) => string;

export enum TableLayout {
  fullWidth = "full-width",
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
  theme: DefaultTheme;
  view: EditorView;
  node: ProsemirrorNode;
  isSelected: boolean;
  isEditable: boolean;
  getPos: () => number;
  decorations: Decoration[];
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
