import { combineReducers } from 'redux';

import atlases from './atlases';
import team from './team';
import editor from './editor';
import user from './user';

export default combineReducers({
  atlases,
  team,
  editor,
  user,
});
