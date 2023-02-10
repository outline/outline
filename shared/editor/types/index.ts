import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
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
  mentionMenuOpen = "mentionMenuOpen",
  mentionMenuClose = "mentionMenuClose",
}

export type MenuItem = {
  icon?: React.ReactElement;
  name?: string;
  title?: string;
  shortcut?: string;
  keywords?: string;
  tooltip?: string;
  defaultHidden?: boolean;
  attrs?: Record<string, any>;
  visible?: boolean;
  active?: (state: EditorState) => boolean;
  appendSpace?: boolean;
};

export type ComponentProps = {
  theme: DefaultTheme;
  view: EditorView;
  node: ProsemirrorNode;
  isSelected: boolean;
  isEditable: boolean;
  getPos: () => number;
};

export type Dispatch = (tr: Transaction) => void;
