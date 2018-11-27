// @flow
import * as React from 'react';
import Checkbox from 'components/Checkbox';
import NotificationSetting from 'models/NotificationSetting';

type Props = {
  setting?: NotificationSetting,
  title: string,
  event: string,
  description: string,
  onChange: *,
};

const NotificationListItem = ({
  setting,
  title,
  event,
  enabled,
  onChange,
  description,
}: Props) => {
  return (
    <Checkbox
      label={title}
      name={event}
      checked={!!setting}
      onChange={onChange}
      note={description}
    />
  );
};

export default NotificationListItem;
