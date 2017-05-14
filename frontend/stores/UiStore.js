// @flow
import { observable, action, computed } from 'mobx';

const UI_STORE = 'UI_STORE';

class UiStore {
  @observable sidebar: boolean;

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
    const data = JSON.parse(
      localStorage.getItem(UI_STORE) || '{"sidebar": true}'
    );
    this.sidebar = data.sidebar;
  }
}

export default UiStore;
export { UI_STORE };
