// @flow
import { extendObservable, action } from 'mobx';

import BaseModel from 'models/BaseModel';
import { client } from 'utils/ApiClient';

type Settings = {
  url: string,
  channel: string,
  channelId: string,
};

type Events = 'documents.create' | 'collections.create';

class Integration extends BaseModel {
  id: string;
  service: string;
  collectionId: string;
  events: Events;
  settings: Settings;

  @action
  update = async (data: Object) => {
    await client.post('/integrations.update', { id: this.id, ...data });
    extendObservable(this, data);
    return true;
  };

  @action
  delete = () => {
    return this.store.delete(this);
  };
}

export default Integration;
