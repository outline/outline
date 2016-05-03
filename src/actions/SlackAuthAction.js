import makeActionCreator from '../utils/actions';
import { replace } from 'react-router-redux';
import { client } from 'utils/ApiClient';
import auth from 'utils/auth';

export const SLACK_AUTH_PENDING = 'SLACK_AUTH_PENDING';
export const SLACK_AUTH_SUCCESS = 'SLACK_AUTH_SUCCESS';
export const SLACK_AUTH_FAILURE = 'SLACK_AUTH_FAILURE';

const slackAuthPending = makeActionCreator(SLACK_AUTH_PENDING);
const slackAuthSuccess = makeActionCreator(SLACK_AUTH_SUCCESS, 'user', 'team');
const slackAuthFailure = makeActionCreator(SLACK_AUTH_FAILURE, 'error');

export function slackAuthAsync(code) {
  return (dispatch) => {
    dispatch(slackAuthPending());

    client.post('/auth.slack', {
      code: code,
    })
    .then(data => {
      auth.setToken(data.data.accessToken);
      dispatch(slackAuthSuccess(data.data.user, data.data.team));
      dispatch(replace('/dashboard'));
    })
    .catch((err) => {
      dispatch(push('/error'));
    })
  };
};