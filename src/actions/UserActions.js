import { push } from 'react-router-redux';
import auth from 'utils/auth';

import makeActionCreator from '../utils/actions';

export const UPDATE_USER = 'UPDATE_USER';

export const updateUser = makeActionCreator(UPDATE_USER, 'user');

export function logoutUser() {
  return (dispatch) => {
    auth.logout();
    dispatch(push('/'));
  };
};
