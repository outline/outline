// @flow
import * as React from 'react';
import Tooltip from 'components/Tooltip';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';

type Props = {
  dateTime: string,
  children?: React.Node,
};

function Time({ dateTime, children }: Props) {
  const date = new Date(dateTime);
  return (
    <Tooltip tooltip={format(date, 'MMMM Do, YYYY h:mm a')} placement="bottom">
      <time dateTime={dateTime}>{children || distanceInWordsToNow(date)}</time>
    </Tooltip>
  );
}

export default Time;
