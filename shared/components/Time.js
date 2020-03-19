// @flow
import * as React from 'react';
import Tooltip from 'components/Tooltip';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';

let callbacks = [];

// This is a shared timer that fires every second, used for
// updating all Time components across the page all at once.
setInterval(() => {
  for (let callback of callbacks) {
    callback();
  }
}, 1000 * 60);

function eachSecond(fn) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter(cb => cb !== fn);
  }
}

type Props = {
  dateTime: string,
  children?: React.Node,
};

function Time({ dateTime, children }: Props) {
  const [autoUpdatingDateTime, setAutoUpdatingDateTime] = React.useState(datetime);

  React.useEffect(() => {
    return eachSecond(() => {
      setAutoUpdatingDateTime(autoUpdatingDateTime + (1000 * 60));
    })
  }, []);

  return (
    <Tooltip tooltip={format(date, 'MMMM Do, YYYY h:mm a')} placement="bottom">
      <time dateTime={autoUpdatingDateTime}>{children || distanceInWordsToNow(date)}</time>
    </Tooltip>
  );
}

export default Time;
