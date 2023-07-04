import { filter } from "lodash";
import { action, computed } from "mobx";
import { IntegrationService } from "@shared/types";
import naturalSort from "@shared/utils/naturalSort";
import BaseStore from "~/stores/BaseStore";
import RootStore from "~/stores/RootStore";
import Integration from "~/models/Integration";

class IntegrationsStore extends BaseStore<Integration> {
  constructor(rootStore: RootStore) {
    super(rootStore, Integration);
  }

  @computed
  get orderedData(): Integration[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  @computed
  get slackIntegrations(): Integration[] {
    return filter(this.orderedData, {
      service: IntegrationService.Slack,
    });
  }

  @action
  async create(
    params: Partial<Integration & { authToken?: string | null }>,
    options?: Record<string, string | boolean | number | undefined>
  ) {
    return super.create(params, options);
  }
}

export default IntegrationsStore;
