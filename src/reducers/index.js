import { combineReducers } from 'redux';

import atlases from './atlases';
import document from './document';

export default combineReducers({
  atlases,
  document,
});
