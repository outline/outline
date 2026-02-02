import { computed } from "mobx";
import { IntegrationService, type IntegrationType } from "@shared/types";
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

  @computed
  get orderedData(): Integration[] {
    return naturalSort(Array.from(this.data.values()), "name");
  }

  @computed
  get github(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.GitHub
    );
  }

  @computed
  get linear(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.Linear
    );
  }

  @computed
  get gitlab(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.GitLab
    );
  }

  @computed
  get bitrix24(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.Bitrix24
    );
  }

  @computed
  get jira(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.Jira
    );
  }

  @computed
  get confluence(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.Confluence
    );
  }

  @computed
  get trello(): Integration<IntegrationType.Embed>[] {
    return this.orderedData.filter(
      (integration) => integration.service === IntegrationService.Trello
    );
  }
}

export default IntegrationsStore;
