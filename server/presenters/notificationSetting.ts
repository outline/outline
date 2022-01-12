import { NotificationSetting } from "@server/models";

export default function present(setting: NotificationSetting) {
  return {
    id: setting.id,
    event: setting.event,
  };
}
