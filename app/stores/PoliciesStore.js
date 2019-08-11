// @flow
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Policy from 'models/Policy';

export default class PoliciesStore extends BaseStore<Policy> {
  actions = [];

  constructor(rootStore: RootStore) {
    super(rootStore, Policy);
  }

  abilties(id: string) {
    const policy = this.get(id);
    return policy ? policy.abilities : {};
  }
}
