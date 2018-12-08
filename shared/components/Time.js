// @flow
import * as React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';

type Props = {
  dateTime: string,
  children?: React.Node,
};

function Time({ dateTime, children }: Props) {
  const date = new Date(dateTime);
  return (
    <time dateTime={dateTime} title={format(date, 'MMMM Do, YYYY h:mm a')}>
      {children || distanceInWordsToNow(date)}
    </time>
  );
}

export default Time;
