import makeActionCreator from '../utils/actions';

// export const TOGGLE_PREVIEW = 'TOGGLE_PREVIEW';
export const UPDATE_TEXT = 'UPDATE_TEXT';
export const REPLACE_TEXT = 'REPLACE_TEXT';

// export const togglePreview = makeActionCreator(TOGGLE_PREVIEW);
export const updateText = makeActionCreator(UPDATE_TEXT, 'text');
export const replaceText = makeActionCreator(REPLACE_TEXT, 'originalText', 'replacedText');
