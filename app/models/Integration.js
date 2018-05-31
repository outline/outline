// @flow
import { extendObservable, action } from 'mobx';

import BaseModel from 'models/BaseModel';
import { client } from 'utils/ApiClient';
import stores from 'stores';
import UiStore from 'stores/UiStore';

type Settings = {
  url: string,
  channel: string,
  channelId: string,
};

type Events = 'documents.create' | 'collections.create';

class Integration extends BaseModel {
  ui: UiStore;

  id: string;
  serviceId: string;
  collectionId: string;
  events: Events;
  settings: Settings;

  @action
  update = async (data: Object) => {
    try {
      await client.post('/integrations.update', { id: this.id, ...data });
      extendObservable(this, data);
    } catch (e) {
      this.ui.showToast('Integration failed to update');
    }
    return false;
  };

  @action
  delete = async () => {
    try {
      await client.post('/integrations.delete', { id: this.id });
      this.emit('integrations.delete', { id: this.id });
      return true;
    } catch (e) {
      this.ui.showToast('Integration failed to delete');
    }
    return false;
  };

  constructor(data?: Object = {}) {
    super();

    extendObservable(this, data);
    this.ui = stores.ui;
  }
}

export default Integration;
