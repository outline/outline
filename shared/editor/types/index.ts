import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { DefaultTheme } from "styled-components";

export type PlainTextSerializer = (node: ProsemirrorNode) => string;

export enum EventType {
  SuggestionsMenuOpen = "suggestionMenuOpen",
  SuggestionsMenuClose = "suggestionMenuClose",
  LinkToolbarOpen = "linkMenuOpen",
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
