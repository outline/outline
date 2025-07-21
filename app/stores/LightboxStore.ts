import { action, observable } from "mobx";
import type { ReactElement } from "react";

export default class LightboxStore {
  @observable
  currentItem: number | null;

  @action
  open({ currentItem }: { currentItem: number }) {
    this.currentItem = currentItem;
  }

  @action
  close() {
    this.currentItem = null;
  }
}
