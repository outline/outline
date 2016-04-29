import { UPDATE_TEAM } from 'actions/TeamActions';

const team = (state = null, action) => {
  switch (action.type) {
    case UPDATE_TEAM: {
      return {
        ...action.team,
      };
    }
    default:
      return state;
  }
};

export default team;