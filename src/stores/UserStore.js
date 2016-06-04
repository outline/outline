import { observable, action, computed, autorun } from 'mobx';
import { browserHistory } from 'react-router';
import { client } from 'utils/ApiClient';
import localforage from 'localforage';

const USER_STORE = 'USER_STORE';

const store = new class UserStore {
  @observable user;
  @observable team;

  @observable token;
  @observable oauthState;

  @observable isLoading;

  /* Computed */

  @computed get authenticated() {
    return !!this.token;
  }

  @computed get asJson() {
    return JSON.stringify({
      user: this.user,
      team: this.team,
      token: this.token,
      oauthState: this.oauthState,
    });
  }

  /* Actions */

  @action logout = () => {
    this.user = null;
    this.token = null;
    browserHistory.push('/');
  };

  @action getOauthState = () => {
    const state = Math.random().toString(36).substring(7);
    this.oauthState = state;
    return this.oauthState;
  }

  @action authWithSlack = async (code, state) => {
    if (state !== this.oauthState) {
      browserHistory.push('/auth-error');
      return;
    }

    let res;
    try {
      res = await client.post('/auth.slack', { code: code });
    } catch (e) {
      browserHistory.push('/auth-error');
      return;
    }

    this.user = res.data.user;
    this.team = res.data.team;
    this.token = res.data.accessToken;
    browserHistory.replace('/dashboard');
  }

  constructor() {
    // Rehydrate
    const data = JSON.parse(localStorage.getItem(USER_STORE)) || {};
    this.user = data.user;
    this.team = data.team;
    this.token = data.token;
    this.oauthState = data.oauthState;
  }
}();

// Persist store to localStorage
autorun(() => {
  localStorage.setItem(USER_STORE, store.asJson);
});


export default store;
