import { SLACK_AUTH_SUCCESS } from 'actions/SlackAuthAction';

const user = (state = null, action) => {
  switch (action.type) {
    case SLACK_AUTH_SUCCESS: {
      return {
        ...action.user,
      };
    }
    default:
      return state;
  }
};

export default user;