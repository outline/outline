import keyMirror from 'fbjs/lib/keyMirror';

/*
 * Action types
 */

export const UPDATE_TEXT = 'UPDATE_TEXT';
export const TOGGLE_EDITORS = 'TOGGLE_EDITORS';
export const ADD_REVISION = 'ADD_REVISION';
export const REPLACE_TEXT= 'REPLACE_TEXT';

export const SLACK_AUTH_PENDING = 'SLACK_AUTH_PENDING';
export const SLACK_AUTH_SUCCESS = 'SLACK_AUTH_SUCCESS';
export const SLACK_AUTH_FAILURE = 'SLACK_AUTH_FAILURE';

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

export function replaceText(originalText, replacedText) {
  return { type: REPLACE_TEXT, originalText, replacedText };
}