// @flow
import { observable, action, computed, autorun, runInAction } from 'mobx';
import invariant from 'invariant';
import { getCookie, setCookie, removeCookie } from 'tiny-cookie';
import { client } from 'utils/ApiClient';
import { stripSubdomain } from 'shared/utils/domains';
import RootStore from 'stores/RootStore';
import User from 'models/User';
import Team from 'models/Team';

const AUTH_STORE = 'AUTH_STORE';

export default class AuthStore {
  @observable user: ?User;
  @observable team: ?Team;
  @observable token: ?string;
  @observable isSaving: boolean = false;
  @observable isSuspended: boolean = false;
  @observable suspendedContactEmail: ?string;
  rootStore: RootStore;

  constructor(rootStore: RootStore) {
    // Rehydrate
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(AUTH_STORE) || '{}');
    } catch (_) {
      // no-op Safari private mode
    }

    this.rootStore = rootStore;
    this.user = data.user;
    this.team = data.team;
    this.token = getCookie('accessToken');

    if (this.token) setImmediate(() => this.fetch());

    autorun(() => {
      try {
        localStorage.setItem(AUTH_STORE, this.asJson);
      } catch (_) {
        // no-op Safari private mode
      }
    });
  }

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
        const { user, team } = res.data;
        this.user = user;
        this.team = team;

        if (window.Bugsnag) {
          Bugsnag.user = {
            id: user.id,
            name: user.name,
            teamId: team.id,
            team: team.name,
          };
        }
      });
    } catch (err) {
      if (err.error === 'user_suspended') {
        this.isSuspended = true;
        this.suspendedContactEmail = err.data.adminEmail;
      }
    }
  };

  @action
  deleteUser = async () => {
    await client.post(`/users.delete`, { confirmation: true });

    runInAction('AuthStore#updateUser', () => {
      this.user = null;
      this.team = null;
      this.token = null;
    });
  };

  @action
  updateUser = async (params: { name?: string, avatarUrl: ?string }) => {
    this.isSaving = true;

    try {
      const res = await client.post(`/users.update`, params);
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

    // remove authentication token itself
    removeCookie('accessToken', { path: '/' });

    // remove session record on apex cookie
    const team = this.team;
    if (team) {
      const sessions = JSON.parse(getCookie('sessions') || '{}');
      delete sessions[team.id];

      setCookie('sessions', JSON.stringify(sessions), {
        domain: stripSubdomain(window.location.hostname),
      });
      this.team = null;
    }

    // add a timestamp to force reload from server
    window.location.href = `${BASE_URL}?done=${new Date().getTime()}`;
  };
}
