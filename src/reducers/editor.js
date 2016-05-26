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
    case 'EDITOR_RESET': {
      return {
        ...initialState,
      }
    }
    case 'EDITOR_UPDATE_TITLE': {
      return {
        ...state,
        title: action.payload,
      }
    }
    case 'EDITOR_UPDATE_TEXT': {
      const title = parseHeader(action.payload);

      console.log(title);

      let unsavedChanges = false;
      if (state.originalText !== action.payload) {
        unsavedChanges = true;
      }
      return {
        ...state,
        unsavedChanges,
        text: action.payload,
        title: title || state.title,
      };
    }
    case 'EDITOR_REPLACE_TEXT': {
      const newText = state.text.replace(
        action.payload.original,
        action.payload.new
      );

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
