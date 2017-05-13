// @flow
import { observable, action } from 'mobx';

class SidebarStore {
  @observable isEditing = false;

  /* Actions */

  @action toggleEdit = () => {
    this.isEditing = !this.isEditing;
  };
}

export default SidebarStore;
