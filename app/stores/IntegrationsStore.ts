import { filter } from "lodash";
import { computed } from "mobx";
import { IntegrationType } from "@shared/types";
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
      service: "slack",
    });
  }

  @computed
  get googleAnalyticsIntegration():
    | Integration<IntegrationType.Analytics>
    | undefined {
    return this.orderedData.find(
      (integration) => integration.service === "google-analytics"
    );
  }
}

export default IntegrationsStore;
