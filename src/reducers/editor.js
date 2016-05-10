import {
  UPDATE_TEXT,
  REPLACE_TEXT,
} from 'actions/EditorActions';

const initialState = {
  originalText: null,
  text: null,
  title: null,
  unsavedChanges: false,
};

const parseHeader = (text) => {
  const firstLine = text.split(/\r?\n/)[0];
  const match = firstLine.match(/^#+ +(.*)$/);

  if (match) {
    return match[1];
  }
}

const editor = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_TEXT: {
      const title = parseHeader(action.text);

      console.log(title);

      let unsavedChanges = false;
      if (state.originalText !== action.text) {
        unsavedChanges = true;
      }
      return {
        ...state,
        unsavedChanges,
        text: action.text,
        title: title || state.title,
      };
    }
    case REPLACE_TEXT: {
      const newText = state.text.replace(action.originalText, action.replacedText);

      return {
        ...state,
        unsavedChanges: true,
        text: newText,
      };
    }
    default:
      return state;
  }
};

export default editor;
