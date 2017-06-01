// @flow
import { observable, computed } from 'mobx';
import type { User, Team } from 'types';

type Options = {
  user: User,
  team: Team,
};

class UserStore {
  @observable user: User;
  @observable team: Team;

  @observable isLoading: boolean = false;

  /* Computed */

  @computed get asJson(): string {
    return JSON.stringify({
      user: this.user,
      team: this.team,
    });
  }

  constructor(options: Options) {
    // Rehydrate
    this.user = options.user;
    this.team = options.team;
  }
}

export default UserStore;
