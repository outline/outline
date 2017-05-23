// @flow
import { observable, action, computed } from 'mobx';

const UI_STORE = 'UI_STORE';

type SidebarPanels = 'main' | 'collection';

class UiStore {
  @observable sidebarVisible: boolean;
  @observable sidebarPanel: SidebarPanels = 'main';

  /* Computed */

  @computed get asJson(): string {
    return JSON.stringify({
      sidebarVisible: this.sidebarVisible,
    });
  }

  /* Actions */

  @action toggleSidebar = (): void => {
    this.sidebarVisible = !this.sidebarVisible;
  };

  @action changeSidebarPanel = (panel: SidebarPanels): void => {
    this.sidebarPanel = panel;
  };

  constructor() {
    // Rehydrate
    const data = JSON.parse(
      localStorage.getItem(UI_STORE) || '{"sidebarVisible": true}'
    );
    this.sidebarVisible = data.sidebarVisible;
  }
}

export default UiStore;
export { UI_STORE };
