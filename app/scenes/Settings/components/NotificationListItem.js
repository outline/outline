// @flow
import * as React from 'react';
import Checkbox from 'components/Checkbox';
import NotificationSetting from 'models/NotificationSetting';

type Props = {
  setting?: NotificationSetting,
  title: string,
  event: string,
  description: string,
  disabled: boolean,
  onChange: (ev: SyntheticInputEvent<>) => void | Promise<void>,
};

const NotificationListItem = ({
  setting,
  title,
  event,
  enabled,
  onChange,
  disabled,
  description,
}: Props) => {
  return (
    <Checkbox
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
