import { UPDATE_USER } from 'actions/UserActions';

const user = (state = null, action) => {
  switch (action.type) {
    case UPDATE_USER: {
      return {
        ...action.user,
      };
    }
    default:
      return state;
  }
};

export default user;