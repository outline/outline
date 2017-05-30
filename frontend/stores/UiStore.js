// @flow
import { observable, action, computed, autorunAsync } from 'mobx';

const UI_STORE = 'UI_STORE';

class UiStore {
  @observable sidebar: boolean = false;

  /* Computed */

  @computed get asJson(): string {
    return JSON.stringify({
      sidebar: this.sidebar,
    });
  }

  /* Actions */

  @action toggleSidebar = (): void => {
    this.sidebar = !this.sidebar;
  };

  constructor() {
    // Rehydrate
    const data = JSON.parse(localStorage.getItem(UI_STORE) || '{}');
    this.sidebar = data.sidebar;

    autorunAsync(() => {
      localStorage.setItem(UI_STORE, this.asJson);
    });
  }
}

export default UiStore;
