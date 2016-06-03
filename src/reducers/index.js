import { combineReducers } from 'redux';

import atlases from './atlases';
import document from './document';
import team from './team';
import user from './user';

export default combineReducers({
  atlases,
  document,
  team,
  user,
});
