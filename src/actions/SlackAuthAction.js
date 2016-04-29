import makeActionCreator from '../utils/actions';
import { push } from 'react-router-redux';
import { client } from 'utils/ApiClient';
import auth from 'utils/auth';

import { updateUser } from './UserActions';
import { updateTeam } from './TeamActions';

export const SLACK_AUTH_PENDING = 'SLACK_AUTH_PENDING';
export const SLACK_AUTH_SUCCESS = 'SLACK_AUTH_SUCCESS';
export const SLACK_AUTH_FAILURE = 'SLACK_AUTH_FAILURE';

const slackAuthPending = makeActionCreator(SLACK_AUTH_PENDING);
const slackAuthSuccess = makeActionCreator(SLACK_AUTH_SUCCESS, 'user');
const slackAuthFailure = makeActionCreator(SLACK_AUTH_FAILURE, 'error');

export function slackAuthAsync(code) {
  return (dispatch) => {
    dispatch(slackAuthPending());

    client.post('/auth.slack', {
      code: code,
    })
    .then(data => {
      auth.setToken(data.data.accessToken);
      dispatch(updateUser(data.data.user));
      dispatch(updateTeam(data.data.team));
      dispatch(push('/dashboard'));
    })
    // .catch((err) => {
    //   dispatch(push('/error'));
    // })
  };
};