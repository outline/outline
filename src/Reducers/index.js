import _ from 'lodash';
import { combineReducers } from 'redux';

import {
  UPDATE_TEXT,
  TOGGLE_EDITORS,
  ActiveEditors,
} from '../Actions';

function activeEditors(state = [ActiveEditors.MARKDOWN, ActiveEditors.TEXT], action) {
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

function text(state = '', action) {
  switch (action.type) {
    case UPDATE_TEXT:
      return action.text;
    default:
      return state;
  }
}

const application = combineReducers({
  activeEditors,
  text,
});

export default application;
