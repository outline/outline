import { observable } from "mobx";
import Storage from "@shared/utils/Storage";

export enum Feature {
  /** New collection permissions UI */
  newCollectionSharing = "newCollectionSharing",
}

/**
 * A simple feature flagging system that stores flags in browser storage.
 */
export class FeatureFlags {
  public static isEnabled(flag: Feature) {
    // init on first read
    if (this.initalized === false) {
      this.cache = new Set();
      for (const key of Object.values(Feature)) {
        const value = Storage.get(key);
        if (value === true) {
          this.cache.add(key);
        }
      }
      this.initalized = true;
    }

    return this.cache.has(flag);
  }

  public static enable(flag: Feature) {
    this.cache.add(flag);
    Storage.set(flag, true);
  }

  public static disable(flag: Feature) {
    this.cache.delete(flag);
    Storage.set(flag, false);
  }

  @observable
  private static cache: Set<Feature> = new Set();

  private static initalized = false;
}
