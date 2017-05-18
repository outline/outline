// @flow
import { observable, action, computed } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { User, Team } from 'types';

const USER_STORE = 'USER_STORE';

class UserStore {
  @observable user: ?User;
  @observable team: ?Team;

  @observable token: ?string;
  @observable oauthState: string;

  @observable isLoading: boolean = false;

  /* Computed */

  @computed get authenticated(): boolean {
    return !!this.token;
  }

  @computed get asJson(): string {
    return JSON.stringify({
      user: this.user,
      team: this.team,
      token: this.token,
      oauthState: this.oauthState,
    });
  }

  /* Actions */

  @action logout = (cb: Function) => {
    this.user = null;
    this.token = null;
    cb();
  };

  @action getOauthState = () => {
    const state = Math.random().toString(36).substring(7);
    this.oauthState = state;
    return this.oauthState;
  };

  @action authWithSlack = async (code: string, state: string) => {
    if (state !== this.oauthState) {
      return {
        success: false,
      };
    }

    let res;
    try {
      res = await client.post('/auth.slack', { code });
    } catch (e) {
      return {
        success: false,
      };
    }

    invariant(
      res && res.data && res.data.user && res.data.team && res.data.accessToken,
      'All values should be available'
    );
    this.user = res.data.user;
    this.team = res.data.team;
    this.token = res.data.accessToken;

    return {
      success: true,
    };
  };

  constructor() {
    // Rehydrate
    const data = JSON.parse(localStorage.getItem(USER_STORE) || '{}');
    this.user = data.user;
    this.team = data.team;
    this.token = data.token;
    this.oauthState = data.oauthState;
  }
}

export default UserStore;
export { USER_STORE };
