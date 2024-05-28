import { Node as ProsemirrorNode } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { DefaultTheme } from "styled-components";
import { Primitive } from "utility-types";

export type PlainTextSerializer = (node: ProsemirrorNode) => string;

export enum EventType {
  SuggestionsMenuOpen = "suggestionMenuOpen",
  SuggestionsMenuClose = "suggestionMenuClose",
  LinkToolbarOpen = "linkMenuOpen",
}

export enum TableLayout {
  fullWidth = "full-width",
}

export type MenuItem = {
  icon?: React.ReactElement;
  name?: string;
  title?: string;
  shortcut?: string;
  keywords?: string;
  tooltip?: string;
  label?: string;
  dangerous?: boolean;
  children?: MenuItem[];
  defaultHidden?: boolean;
  attrs?:
    | Record<string, Primitive>
    | ((state: EditorState) => Record<string, Primitive>);
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
