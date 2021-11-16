import { find } from "lodash";
import NotificationSetting from "models/NotificationSetting";
import BaseStore from "./BaseStore";
import RootStore from "./RootStore";

export default class NotificationSettingsStore extends BaseStore<
  NotificationSetting
> {
  // @ts-expect-error ts-migrate(2416) FIXME: Property 'actions' in type 'NotificationSettingsSt... Remove this comment to see the full error message
  actions = ["list", "create", "delete"];

  constructor(rootStore: RootStore) {
    super(rootStore, NotificationSetting);
  }

  getByEvent = (event: string) => {
    return find(this.orderedData, {
      event,
    });
  };
}
