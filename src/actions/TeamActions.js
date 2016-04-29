import makeActionCreator from '../utils/actions';

export const UPDATE_TEAM = 'UPDATE_TEAM';

export const updateTeam = makeActionCreator(UPDATE_TEAM, 'team');
