import orderBy from "lodash/orderBy";
import { observable, action, computed } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { Toast, ToastOptions } from "~/types";

export default class ToastsStore {
  @observable
  toasts: Map<string, Toast> = new Map();

  lastToastId: string;

  @action
  showToast = (
    message: string,
    options: ToastOptions = {
      type: "info",
    }
  ) => {
    if (!message) {
      return;
    }
    const lastToast = this.toasts.get(this.lastToastId);

    if (lastToast?.message === message) {
      this.toasts.set(this.lastToastId, {
        ...lastToast,
        reoccurring: lastToast.reoccurring ? ++lastToast.reoccurring : 1,
      });
      return this.lastToastId;
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    this.toasts.set(id, {
      id,
      message,
      createdAt,
      type: options.type,
      timeout: options.timeout,
      action: options.action,
    });
    this.lastToastId = id;
    return id;
  };

  @action
  hideToast = (id: string) => {
    this.toasts.delete(id);
  };

  @computed
  get orderedData(): Toast[] {
    return orderBy(Array.from(this.toasts.values()), "createdAt", "desc");
  }
}
