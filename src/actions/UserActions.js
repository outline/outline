import makeActionCreator from '../utils/actions';

export const UPDATE_USER = 'UPDATE_USER';

export const updateUser = makeActionCreator(UPDATE_USER, 'user');
