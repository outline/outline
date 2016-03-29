import _ from 'lodash';
import { combineReducers } from 'redux';

import {
  UPDATE_TEXT,
  TOGGLE_EDITORS,
  TOGGLE_HISTORY_SIDEBAR,
  ADD_REVISION,
  REPLACE_TEXT,
  ActiveEditors,
} from '../Actions';

const activeEditors = (state = [ActiveEditors.MARKDOWN, ActiveEditors.TEXT], action) => {
  switch (action.type) {
    case TOGGLE_EDITORS: {
      // TODO: A rewrite would be nice
      const newState = _.xor(state, [action.toggledEditor]);
      if (newState.length > 0) {
        return newState;
      } else {
        return _.xor([ActiveEditors.MARKDOWN, ActiveEditors.TEXT], [action.toggledEditor]);
      }
    }
    default:
      return state;
  }
};

const historySidebar = (state = { visible: false }, action) => {
  switch (action.type) {
    case TOGGLE_HISTORY_SIDEBAR: {
      return {
        ...state,
        visible: !state.visible,
      };
    }
    default:
      return state;
  }
};

const defaultTest = `# Welcome to Beautiful Atlas

This is just a small preview here's what you can do:

- Write markdown or rich text, you choose
- Dont' worry about saving
- One document for now
- More to come
`

const textDefaultState = {
  text: defaultTest,
  revisions: [],
  unsavedChanges: false,
};

const text = (state = textDefaultState, action) => {
  const lastRevision = _.last(state.revisions);

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

export default combineReducers({
  activeEditors,
  historySidebar,
  text,
});
