const defaultTest = `# Welcome to Beautiful Atlas

This is just a small preview here's what you can do:

- Write markdown or rich text, you choose
- Dont' worry about saving
- One document for now
- More to come
`

const state = {
  previousTest: null,
  text: null,
  unsavedChanges: false,
};

const text = (state = state, action) => {

  switch (action.type) {
    case UPDATE_TEXT: {
      let unsavedChanges = false;
      if (lastRevision && lastRevision.text !== state.text) {
        unsavedChanges = true;
      }
      return {
        ...state,
        unsavedChanges,
        text: action.text,
      };
    }
    case ADD_REVISION: {
      // Create new revision if it differs from the previous one
      if (!lastRevision || lastRevision.text !== state.text) {
        const lastId = lastRevision ? lastRevision.id : 0;
        return {
          ...state,
          revisions: [
            ...state.revisions,
            {
              id: lastId + 1,
              text: state.text,
              created_at: action.createdAt,
            },
          ],
          unsavedChanges: false,
        };
      } else {
        return state;
      }
    }
    case REPLACE_TEXT: {
      const newText = state.text.replace(action.originalText, action.replacedText);

      return {
        ...state,
        text: newText,
      };
    }
    default:
      return state;
  }
};