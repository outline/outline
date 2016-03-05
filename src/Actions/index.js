import keyMirror from 'fbjs/lib/keyMirror';

/*
 * Action types
 */

export const UPDATE_TEXT = 'UPDATE_TEXT';
export const TOGGLE_EDITORS = 'TOGGLE_EDITORS';
export const ADD_REVISION = 'ADD_REVISION';

/*
 * Other Constants
 */

export const ActiveEditors = keyMirror({
  MARKDOWN: null,
  TEXT: null,
});

/*
 * Action creators
 */

export function updateText(text, editor) {
  return { type: UPDATE_TEXT, text, editor };
}

export function toggleEditors(toggledEditor) {
  return { type: TOGGLE_EDITORS, toggledEditor };
}

export function addRevision(createdAt) {
  return { type: ADD_REVISION, createdAt };
}
