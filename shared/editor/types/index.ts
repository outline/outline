import type { TFunction } from "i18next";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
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
  children?: MenuItem[];
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
};

export type ComponentProps = {
  theme: DefaultTheme;
  view: EditorView;
  node: ProsemirrorNode;
  isSelected: boolean;
  isEditable: boolean;
  getPos: () => number;
};

export interface NodeMarkAttr {
  type: string;
  [key: string]: any;
}
