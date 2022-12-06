import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import * as React from "react";
import { DefaultTheme } from "styled-components";

export type PlainTextSerializer = (node: ProsemirrorNode) => string;

export enum EventType {
  blockMenuOpen = "blockMenuOpen",
  blockMenuClose = "blockMenuClose",
  emojiMenuOpen = "emojiMenuOpen",
  emojiMenuClose = "emojiMenuClose",
  linkMenuOpen = "linkMenuOpen",
  linkMenuClose = "linkMenuClose",
}

export type MenuItem = {
  icon?: typeof React.Component | React.FC<any>;
  name?: string;
  title?: string;
  shortcut?: string;
  keywords?: string;
  tooltip?: string;
  defaultHidden?: boolean;
  attrs?: Record<string, any>;
  visible?: boolean;
  active?: (state: EditorState) => boolean;
};

export type ComponentProps = {
  theme: DefaultTheme;
  node: ProsemirrorNode;
  isSelected: boolean;
  isEditable: boolean;
  getPos: () => number;
};

export type Dispatch = (tr: Transaction) => void;
