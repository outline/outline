import { NotificationSetting } from "../models";

// @ts-expect-error ts-migrate(2749) FIXME: 'NotificationSetting' refers to a value, but is be... Remove this comment to see the full error message
export default function present(setting: NotificationSetting) {
  return {
    id: setting.id,
    event: setting.event,
  };
}
