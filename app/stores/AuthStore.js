// @flow
import { observable, action, computed, autorun, runInAction } from 'mobx';
import invariant from 'invariant';
import Cookie from 'js-cookie';
import localForage from 'localforage';
import { client } from 'utils/ApiClient';
import type { User, Team } from 'types';

const AUTH_STORE = 'AUTH_STORE';

class AuthStore {
  @observable user: ?User;
  @observable team: ?Team;
  @observable token: ?string;
  @observable isSaving: boolean = false;
  @observable isLoading: boolean = false;
  @observable isSuspended: boolean = false;
  @observable suspendedContactEmail: ?string;

  /* Computed */

  @computed
  get authenticated(): boolean {
    return !!this.token;
  }

  @computed
  get asJson(): string {
    return JSON.stringify({
      user: this.user,
      team: this.team,
    });
  }

  @action
  fetch = async () => {
    try {
      const res = await client.post('/auth.info');
      invariant(res && res.data, 'Auth not available');

      runInAction('AuthStore#fetch', () => {
        this.user = res.data.user;
        this.team = res.data.team;
      });
    } catch (err) {
      if (err.error.error === 'user_suspended') {
        this.isSuspended = true;
        this.suspendedContactEmail = err.error.data.adminEmail;
      }
    }
  };

  @action
  deleteUser = async () => {
    await client.post(`/user.delete`, { confirmation: true });

    runInAction('AuthStore#updateUser', () => {
      this.user = null;
      this.team = null;
      this.token = null;
    });
  };

  @action
  updateUser = async (params: { name: string, avatarUrl: ?string }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/user.update`, params);
      invariant(res && res.data, 'User response not available');

      runInAction('AuthStore#updateUser', () => {
        this.user = res.data;
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  updateTeam = async (params: {
    name?: string,
    avatarUrl?: ?string,
    sharing?: boolean,
  }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/team.update`, params);
      invariant(res && res.data, 'Team response not available');

      runInAction('AuthStore#updateTeam', () => {
        this.team = res.data;
      });
    } finally {
      this.isSaving = false;
    }
  };

  @action
  logout = async () => {
    this.user = null;
    this.token = null;

    Cookie.remove('accessToken', { path: '/' });
    await localForage.clear();

    // add a timestamp to force reload from server
    window.location.href = `${BASE_URL}?done=${new Date().getTime()}`;
  };

  constructor() {
    // Rehydrate
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(AUTH_STORE) || '{}');
    } catch (_) {
      // no-op Safari private mode
    }
    this.user = data.user;
    this.team = data.team;

    // load token from state for backwards compatability with
    // sessions created pre-google auth
    this.token = Cookie.get('accessToken') || data.token;

    if (this.token) setImmediate(() => this.fetch());

    autorun(() => {
      try {
        localStorage.setItem(AUTH_STORE, this.asJson);
      } catch (_) {
        // no-op Safari private mode
      }
    });
  }
}

export default AuthStore;
