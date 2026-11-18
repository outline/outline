import { override } from "mobx";
import { computedFn } from "mobx-utils";
import type { IntegrationService, IntegrationType } from "@shared/types";
import naturalSort from "@shared/utils/naturalSort";
import type RootStore from "~/stores/RootStore";
import Store from "~/stores/base/Store";
import Integration from "~/models/Integration";

class IntegrationsStore extends Store<Integration> {
  constructor(rootStore: RootStore) {
    super(rootStore, Integration);
  }

  findByService(service: string) {
    return this.orderedData.find(
      (integration) => integration.service === service
    );
  }

  /**
   * Returns the integrations for a service, ordered by name.
   *
   * @param service the service to return integrations for.
   * @returns the integrations for the service.
   */
  filterByService = computedFn(
    (service: IntegrationService): Integration<IntegrationType.Embed>[] =>
      this.orderedData.filter((integration) => integration.service === service),
    { requiresReaction: false }
  );

  @override
  get orderedData(): Integration[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }
}

export default IntegrationsStore;
