// @flow
import { autorunAsync } from 'mobx';
import UserStore, { USER_STORE } from './UserStore';
import UiStore, { UI_STORE } from './UiStore';
import DashboardStore from './DashboardStore';

const user = new UserStore();
const ui = new UiStore();
const dashboard = new DashboardStore({
  team: user.team,
});

const stores = {
  user,
  ui,
  dashboard,
};

// Persist stores to localStorage
// TODO: move to store constructors
autorunAsync(() => {
  localStorage.setItem(USER_STORE, stores.user.asJson);
  localStorage.setItem(UI_STORE, stores.ui.asJson);
});

export default stores;
