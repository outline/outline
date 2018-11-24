// @flow
import { computed } from 'mobx';
import { filter } from 'lodash';
import naturalSort from 'shared/utils/naturalSort';
import BaseStore from 'stores/BaseStore';
import RootStore from 'stores/RootStore';
import Integration from 'models/Integration';

class IntegrationsStore extends BaseStore<Integration> {
  constructor(rootStore: RootStore) {
    super({
      model: Integration,
      rootStore,
    });

    this.on('integrations.delete', (data: { id: string }) => {
      this.remove(data.id);
    });
  }

  @computed
  get orderedData(): Integration[] {
    return naturalSort(this.data.values(), 'name');
  }

  @computed
  get slackIntegrations(): Integration[] {
    return filter(this.orderedData, { service: 'slack' });
  }
}

export default IntegrationsStore;
