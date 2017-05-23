// @flow
import { autorunAsync } from 'mobx';
import UserStore, { USER_STORE } from './UserStore';
import UiStore, { UI_STORE } from './UiStore';
import ErrorsStore from './ErrorsStore';

const stores = {
  user: new UserStore(),
  ui: new UiStore(),
  errors: new ErrorsStore(),
};

// Persist stores to localStorage
// TODO: move to store constructors
autorunAsync(() => {
  localStorage.setItem(USER_STORE, stores.user.asJson);
  localStorage.setItem(UI_STORE, stores.ui.asJson);
});

export default stores;
