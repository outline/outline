import { SLACK_AUTH_SUCCESS } from 'actions/SlackAuthAction';

const team = (state = null, action) => {
  switch (action.type) {
    case SLACK_AUTH_SUCCESS: {
        return {
          ...action.team,
        };
      }
    default:
      return state;
  }
};

export default team;