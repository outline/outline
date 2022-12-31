import { NotificationSetting } from "@server/models";

export default function presentNotificationSetting(
  setting: NotificationSetting
) {
  return {
    id: setting.id,
    event: setting.event,
  };
}
