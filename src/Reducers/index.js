import _ from 'lodash';
import { combineReducers } from 'redux';

import {
  UPDATE_TEXT,
  TOGGLE_EDITORS,
  TOGGLE_HISTORY_SIDEBAR,
  ADD_REVISION,
  ActiveEditors,
} from '../Actions';

const activeEditors = (state = [ActiveEditors.MARKDOWN, ActiveEditors.TEXT], action) => {
  switch (action.type) {
    case TOGGLE_EDITORS: {
      const newState = _.xor(state, [action.toggledEditor]);
      if (newState.length > 0) {
        return newState;
      } else {
        return [action.toggledEditor];
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

const text = (state = { text: '', revisions: [] }, action) => {
  switch (action.type) {
    case UPDATE_TEXT:
      return {
        ...state,
        text: action.text,
      };
    case ADD_REVISION: {
      const lastRevision = _.last(state.revisions);
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
        };
      } else {
        return state;
      }
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
