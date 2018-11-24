// @flow
import * as React from 'react';
import Checkbox from 'components/Checkbox';

type Props = {
  setting: Object,
  title: string,
  event: string,
  description: string,
  enabled: boolean,
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
      checked={enabled}
      onChange={onChange}
      note={description}
    />
  );
};

export default NotificationListItem;
