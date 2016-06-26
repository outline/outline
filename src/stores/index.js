import UserStore, { USER_STORE } from './UserStore';
import { autorun } from 'mobx';

const stores = {
  user: new UserStore(),
};

// Persist store to localStorage
autorun(() => {
  localStorage.setItem(USER_STORE, stores.user.asJson);
});

export default stores;