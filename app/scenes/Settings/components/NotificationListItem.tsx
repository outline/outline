import * as React from "react";
import NotificationSetting from "~/models/NotificationSetting";
import Switch from "~/components/Switch";

type Props = {
  setting?: NotificationSetting;
  title: string;
  event: string;
  description: string;
  disabled: boolean;
  onChange: (ev: React.SyntheticEvent) => void | Promise<void>;
};

const NotificationListItem = ({
  setting,
  title,
  event,
  onChange,
  disabled,
  description,
}: Props) => {
  return (
    <Switch
      label={title}
      name={event}
      checked={!!setting}
      onChange={onChange}
      note={description}
      disabled={disabled}
    />
  );
};

export default NotificationListItem;
