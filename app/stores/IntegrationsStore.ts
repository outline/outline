import { filter } from "lodash";
import { computed } from "mobx";
import naturalSort from "@shared/utils/naturalSort";
import BaseStore from "~/stores/BaseStore";
import RootStore from "~/stores/RootStore";
import Integration from "~/models/Integration";

class IntegrationsStore<T> extends BaseStore<Integration<T>> {
  constructor(rootStore: RootStore) {
    super(rootStore, Integration);
  }

  @computed
  get orderedData(): Integration<T>[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  @computed
  get slackIntegrations(): Integration<T>[] {
    return filter(this.orderedData, {
      service: "slack",
    });
  }
}

export default IntegrationsStore;
