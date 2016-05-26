import { createAction } from 'redux-actions';

export const resetEditor = createAction('EDITOR_RESET');
export const updateText  = createAction('EDITOR_UPDATE_TEXT');
export const updateTitle = createAction('EDITOR_UPDATE_TITLE');
export const replaceText = createAction('EDITOR_REPLACE_TEXT');

