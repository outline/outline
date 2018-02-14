// @flow
import { extendObservable, action } from 'mobx';

import BaseModel from 'models/BaseModel';
import { client } from 'utils/ApiClient';
import stores from 'stores';
import ErrorsStore from 'stores/ErrorsStore';

class Integration extends BaseModel {
  errors: ErrorsStore;

  id: string;
  serviceId: string;

  @action
  delete = async () => {
    try {
      await client.post('/integrations.delete', { id: this.id });
      this.emit('integrations.delete', {
        id: this.id,
      });
      return true;
    } catch (e) {
      this.errors.add('Integration failed to delete');
    }
    return false;
  };

  constructor(data?: Object = {}) {
    super();

    extendObservable(this, data);
    this.errors = stores.errors;
  }
}

export default Integration;
