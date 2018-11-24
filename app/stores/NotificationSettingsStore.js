// @flow
import NotificationSetting from 'models/NotificationSetting';
import BaseStore from './BaseStore';
import RootStore from './RootStore';

class NotificationSettingsStore extends BaseStore<NotificationSetting> {
  constructor(rootStore: RootStore) {
    super({
      model: NotificationSetting,
      actions: ['list', 'create', 'delete'],
      rootStore,
    });
  }
}

export default NotificationSettingsStore;
