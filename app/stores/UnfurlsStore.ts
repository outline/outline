import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { client } from "~/utils/ApiClient";
import RootStore from "./RootStore";

export default class UnfurlsStore {
  private rootStore: RootStore;

  constructor(rootStore: RootStore) {
    this.rootStore = rootStore;
  }

  fetch = async <UnfurlType extends UnfurlResourceType>(url: string) => {
    const data = await client.post("/urls.unfurl", {
      url,
    });

    if (!data) {
      return;
    }

    return data as UnfurlResponse[UnfurlType];
  };
}
