// @flow
import * as React from 'react';
import Tooltip from 'components/Tooltip';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import format from 'date-fns/format';

let callbacks = [];

// This is a shared timer that fires every minute, used for
// updating all Time components across the page all at once.
setInterval(() => {
  callbacks.forEach(cb => cb());
}, 1000 * 60);

function eachMinute(fn) {
  callbacks.push(fn);

  return () => {
    callbacks = callbacks.filter(cb => cb !== fn);
  };
}

type Props = {
  dateTime: string,
  children?: React.Node,
};

class Time extends React.Component<Props> {
  removeEachMinuteCallback: () => void;

  componentDidMount() {
    this.removeEachMinuteCallback = eachMinute(() => {
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    this.removeEachMinuteCallback();
  }

  render() {
    return (
      <Tooltip
        tooltip={format(this.props.dateTime, 'MMMM Do, YYYY h:mm a')}
        placement="bottom"
      >
        <time dateTime={this.props.dateTime}>
          {this.props.children || distanceInWordsToNow(this.props.dateTime)}
        </time>
      </Tooltip>
    );
  }
}

export default Time;
