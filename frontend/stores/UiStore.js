import { observable, action, computed } from 'mobx';

const UI_STORE = 'UI_STORE';

class UiStore {
  @observable sidebar;

  /* Computed */

  @computed get asJson() {
    return JSON.stringify({
      sidebar: this.sidebar,
    });
  }

  /* Actions */

  @action toggleSidebar = () => {
    this.sidebar = !this.sidebar;
  };

  constructor() {
    // Rehydrate
    const data = JSON.parse(localStorage.getItem(UI_STORE) || '{}');
    this.sidebar = data.sidebar;
  }
}

export default UiStore;
export { UI_STORE };
