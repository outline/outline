import invariant from "invariant";
import { action, observable } from "mobx";
import { client } from "~/utils/ApiClient";
import { Channel } from "../../shared/types";

// toast.error(t("Channels could not be loaded, please reload the app"));

class ChannelsStore {
  @observable
  data: Channel[] = [];

  @observable
  isLoading: boolean = false;

  @observable
  isForceLoaded: boolean = false;

  @observable
  isLoadError: boolean = false;

  @action
  async load({ force }: { force: boolean } = { force: false }): Promise<void> {
    this.isLoading = true;
    this.isLoadError = false;
    try {
      const res = await client.post("/mattermost.channels", {
        force,
      });

      invariant(res?.data, "Data should be available");
      this.data = res.data;

      if (force) {
        this.isForceLoaded = true;
      }
    } catch (err) {
      this.isLoadError = true;
    } finally {
      this.isLoading = false;
    }
  }
}

export const channels = new ChannelsStore();
