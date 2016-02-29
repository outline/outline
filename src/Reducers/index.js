import _ from 'lodash';
import { combineReducers } from 'redux';

import {
  UPDATE_TEXT,
  TOGGLE_EDITORS,
  TOGGLE_HISTORY_SIDEBAR,
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
}

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
}

const text = (state = '', action) => {
  switch (action.type) {
    case UPDATE_TEXT:
      return action.text;
    default:
      return state;
  }
}

export default combineReducers({
  activeEditors,
  historySidebar,
  text,
});
